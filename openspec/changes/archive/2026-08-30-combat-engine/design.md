## Context

`10_戰鬥模型.md` 定義了完整的公式草案（傷害、crit/dodge、難度倍率、wave 機率），這些數值標記為 placeholder、待 playtest 調整（CTX-ASM-005）。本 change 的重點是把「計算流程」做對（決定性、單次模擬、可稽核），數值本身之後可透過調整常數檔微調而不動邏輯。

## Goals / Non-Goals

**Goals:**
- 一場戰鬥（含多 wave/多敵）在單一 server 端呼叫內完整模擬到結束，回傳完整 `combatLog`（NFR-009）
- 所有隨機判定（crit/dodge/掉落）皆透過 `adventure-run-core` 提供的 `RngService`，不自行 `Math.random()`
- 戰鬥中不接受任何玩家操作（RULE-016）——這是設計上刻意的簡化（無技能系統）

**Non-Goals:**
- 不實作技能系統（明確排除，CTX-CON-008）
- 不決定 `combatLog` 是否落庫（`10_戰鬥模型.md` 建議「可選/截斷」，本 change 先不落庫，只回傳給 client；若之後需要稽核，`combatSummary` 已足夠支撐分數驗證的最低需求）

## Decisions

- **時間軸模擬用離散事件排程**：每個單位（玩家、敵人們）各自維護 `nextAttackAt`，每次取 `nextAttackAt` 最小的單位行動，行動後 `nextAttackAt += actionIntervalSec`，直到某一方全滅或玩家死亡。這比「回合制」更貼近 spec 描述的「行動速度」語意（秒/次）。
- **RunModifier 套用時機**：在每次傷害計算前，先用一個 `applyModifiers(baseStats, activeModifiers)` 純函數疊加所有生效中的 Blessing/Curse 效果，回傳修正後的臨時 stats，不直接改動 Character 或 AdventureRun 文件（RunModifier 效果是計算期修正，不是持久化的數值變更）。
- **多波/多敵生成**：`waveCount`/`enemyCount` 由 `adventure-run-core` 的 `advance` 決定節點時就已經算好並放進 `currentNodeData`（因為這是「決定要打什麼」的職責，屬於狀態機推進），本 change 的 `CombatResolver` 只負責「怎麼打」，輸入已經是確定的 wave/敵人組成。
- **掉落計算集中在戰鬥結束後一次結算**：金幣/物品/gems 的掉落判定在整場戰鬥模擬完後一次跑完（而非每次擊殺單獨判定再逐一寫入），減少 RNG 呼叫次數與程式複雜度，同時仍保持「每個擊殺事件都各自做一次獨立判定」的語意（只是批次執行而非批次判定邏輯）。

- **敵人資料表（ASSUMPTION，`10_戰鬥模型.md` 不存在於本 repo，`docs/worldview.md` 明確將怪物範本命名/數值留給本 change 決定）**：新增 4 種敵人原型（呼應 worldview 的「維修設施殘存 GkBot 與失控機具」+ `logicard-duel` 的工作/防禦/侵略/雜兵 4 型分野，見 `server/constants/combat.ts`），各自的 base ATK/DEF/HP/actionIntervalSec 在 `enemyLevel=1` 時設定，實際數值透過 `getStatMultipliers()`（`adventure-run-core` 已提供）依 `enemyLevel`/tier 縮放。每次戰鬥的敵人從 4 種原型中依 RNG 隨機選取。crit/dodge 用跟玩家相同的 base 值（`COMBAT_CONFIG.BASE_CRIT_CHANCE`/`BASE_DODGE_CHANCE`/`CRIT_MULTIPLIER`），敵人沒有 AGI 屬性所以不做 per-AGI 加成。
- **分數/金幣/物品/gems 掉落公式（ASSUMPTION，spec 只說「受 LUCK 影響」沒給係數）**：
  - `score`：每擊敗一隻敵人 `enemyLevel * 10 * tierMultiplier`（NORMAL=1/ELITE=2/STRONG_ELITE=4）累加——這個值後續會被 `adventure-run-core` 的 `settleRun` 當作 `expGained`，所以間接決定了升級曲線
  - `gold`：每擊敗一隻敵人基礎 `enemyLevel * 2`，總和乘上 `(1 + LUCK * 0.02)`
  - 物品掉落：每擊敗一隻敵人 `clamp(0.15 + LUCK * 0.005, 0, 0.40)` 機率掉落一件隨機 EQUIPMENT 模板，`maxRarity` 依節點 tier 封頂（NORMAL→SR、ELITE→SSR、STRONG_ELITE→L，避免雜兵掉傳說裝備）
  - `blessingPoints`：每場戰鬥勝利獲得 1（NORMAL）/2（ELITE）/3（STRONG_ELITE）點
  - gems：依 enemyLevel 分級——1~10 級 3% 機率掉 1 顆、11~20 級 6% 機率掉 1~3 顆、21~30 級 10% 機率掉 3~5 顆；`>30` 依 spec scenario 明確指示套用 21~30 級距規則作為 fallback
- **目標選擇規則（ASSUMPTION）**：玩家固定攻擊目前存活敵人中最早生成的一個（依生成順序），敵人固定攻擊玩家（單一目標）；一波敵人全滅後若還有下一波，立即生成新一波敵人接續戰鬥，玩家 HP 不重置。
- **前端只顯示結果，不做即時演出**：`combatLog` 在前端以簡化的靜態事件列表呈現（攻擊/暴擊/閃避/死亡），不做逐幀動畫或即時播放——戰鬥本身是伺服器單次模擬完成的（NFR-009），前端只是把已經算好的結果攤開顯示，維持跟後端一致的「一次請求、一次結果」模型，動畫演出留待之後有需求再迭代。

## Risks / Trade-offs

- [風險] `combatLog` 若戰鬥拖很長（多 wave 多敵）可能造成回應體積偏大 → [可接受]：`waveCountMax=2`、`enemyCountMax=3` 已經限制了戰鬥規模上限，且不落庫只回傳一次
- [風險] FR-040（enemyLevel > 30 的 gems 掉落規則未定義）會在高等級 run 出現行為不明確 → [緩解]：本 change 先套用「20~30 級距」的既有規則作為 fallback（10% 機率、5~8 顆），並在程式碼加註明確標示這是 fallback 而非正式規則，等待相關人確認後再調整（needs-review，見 traceability.yaml）
