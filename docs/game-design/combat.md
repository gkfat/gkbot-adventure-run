# 戰鬥系統機制

> 本文件是內部設計參考文件，整理冒險 run 中 COMBAT/ELITE/STRONG_ELITE/BOSS 節點的實際戰鬥機制與數值來源，供後續文案/平衡調整對齊使用。權威來源為 `openspec/specs/combat-engine/spec.md`、`server/constants/combat.ts`、`server/constants/difficulty.ts`、`server/services/combat.service.ts`（含其測試）與 `shared/types/adventure.ts`；標記「ASSUMPTION」的數值是對應 change 在別處找不到定義時自行發明、可自由調整的暫定值，並非既定平衡數字。

## 1. 觸發與整體流程

- 玩家在 COMBAT 節點的冒險畫面點擊「開始戰鬥」，前端呼叫 `POST /api/adventure/combat/start`；伺服器以**決定性 RNG 單次模擬整場戰鬥**（含多 wave/多敵）至某一方全滅為止，回傳完整 `combatLog` 與 `combatSummary`，**戰鬥進行中不接受任何玩家操作**。
- 不是固定順序的「回合制」，而是依**行動速度（`actionIntervalSec`，秒）**的離散事件排程：每個單位（玩家、每隻敵人）都有自己的 `nextAttackAt`（下次行動的相對時間，毫秒），每次由 `player` + 存活敵人中 `nextAttackAt` 最小者行動，攻擊後該單位的 `nextAttackAt += actionIntervalSec * 1000`，藤循環直到某一方全滅或 `MAX_ROUNDS = 500`（安全上限，非設計數值）。
- 玩家永遠攻擊「敵方存活清單中的第一隻」，敵人永遠攻擊玩家（無敵人間互打、無玩家選擇攻擊目標的機制）。
- 傷害公式：`damage = max(1, ATK - DEF) * (crit ? critMultiplier : 1)`。
- 命中判定：先判定防禦方是否閃避（DODGE，傷害為 0），再判定攻擊方是否暴擊（CRIT）。
- crit/dodge 機率（`COMBAT_CONFIG`，玩家用）：

| 項目 | 基礎值 | 每點 AGI | 上限 |
|---|---|---|---|
| 暴擊率 | 5% | +0.3% | 35% |
| 暴擊倍率 | ×1.5（固定） | — | — |
| 閃避率 | 3% | +0.2% | 25% |

- 敵人共用同一組基礎 crit/dodge/暴擊倍率（`ENEMY_COMBAT_STATS`），但**不吃 AGI 加成**（敵人無 AGI 屬性）：暴擊率固定 5%、暴擊倍率 ×1.5、閃避率固定 3%。
- `combatLog` 每筆事件含 `timestamp`（相對戰鬥時間 ms）、`actorId`/`targetId`、`action`（`ATTACK`/`CRIT`/`DODGE`/`DEATH`）；`roundCount` 統計 log 中排除 `DEATH` 事件後的筆數。
- 戰鬥節點在**產生節點時**就先決定並存入 `currentNodeData` 的，是「第一波」完整敵人陣容（種類/名稱/描述/依 tier+enemyLevel 算好的 HP），供玩家開戰前預覽；第二波（若有）不預先揭露，實際解算時才決定。

## 2. 敵人 Archetype 基礎數值（`ENEMY_ARCHETYPES`，enemyLevel = 1 時的基礎值）

| Archetype | 描述 | baseAtk | baseDef | baseHp | actionIntervalSec | bossMinionCount | canReinforce |
|---|---|---|---|---|---|---|---|
| 維修型 GkBot | 殘存的維修機具，機械手臂仍徒勞地執行著早已過期的保養指令。 | 8 | 4 | 60 | 2.5 | 2 | 是 |
| 保全機具 | 失控的保全單位，將任何靠近的生物體視為入侵者。 | 6 | 8 | 80 | 3.0 | 2 | 否 |
| 失控搬運機 | 原本負責搬運零件的機具，如今橫衝直撞、不辨敵我。 | 12 | 2 | 50 | 2.2 | 1 | 是 |
| 廢棄零件堆 | 拼湊而成的殘骸堆，靠著殘留電力勉強驅動、行動遲緩。 | 4 | 2 | 30 | 3.5 | 0 | 否 |

> ASSUMPTION（`server/constants/combat.ts` 檔頭註解）：這四個 archetype 的數值、描述、`bossMinionCount`、`canReinforce` 別處都沒有定義（`10_戰鬥模型.md` 不存在，`docs/worldview.md` 明確把怪物命名/數值留給本 change 決定），皆為 `combat-engine` change 自行發明，可自由調整；`bossMinionCount`/`canReinforce` 則是 `chapter-level-structure` change 追加發明，見第 6 節。實際戰鬥數值由 `getStatMultipliers()` 依節點真實的 enemyLevel/tier 再乘一次倍率（見第 3 節），此表只是 enemyLevel=1 的基礎值。

## 3. Enemy Tier 與數值倍率（`getStatMultipliers`，`difficulty.ts`）

先算「每等級成長」的基礎倍率（`levelSteps = max(0, enemyLevel - 1)`）：

| 屬性 | 每等成長 |
|---|---|
| HP | ×(1 + levelSteps × 0.08) |
| ATK | ×(1 + levelSteps × 0.07) |
| DEF | ×(1 + levelSteps × 0.05) |

再乘上 tier 倍率（疊加在等級成長之上，不是疊加在 1 級怪物上）：

| Tier | HP 倍率 | ATK 倍率 | DEF 倍率 |
|---|---|---|---|
| NORMAL | ×1.0 | ×1.0 | ×1.0 |
| ELITE | ×1.8 | ×1.6 | ×1.3 |
| STRONG_ELITE | ×2.6 | ×2.1 | ×1.6 |
| BOSS | ×4.0 | ×2.8 | ×2.0 |

> ASSUMPTION（`difficulty.ts` 註解）：BOSS 倍率別處未定義，僅要求「延續 Elite/Strong Elite 的遞增曲線、三項數值都高於 Strong Elite」，數字本身可自由調整。

最終戰鬥數值：`round(archetype.baseXxx × 等級倍率 × tier倍率)`。

## 4. Enemy Level 隨 step 成長

```
enemyLevel = 1 + floor(step / ENEMY_LEVEL_STEP_DIVISOR)
```

`ENEMY_LEVEL_STEP_DIVISOR = 2`（`DIFFICULTY_CONFIG`），即每 2 個 step，enemyLevel 提升 1 級。

## 5. 多波 / 多敵機率（一般 COMBAT/ELITE/STRONG_ELITE 節點，依 `step`）

| 判定 | 公式（clamp 至上限） |
|---|---|
| 第 2 波出現機率 | clamp(0.10 + 0.01×step, 0, 0.60) |
| 單波第 2 隻敵人機率 | clamp(0.15 + 0.01×step, 0, 0.70) |
| 單波第 3 隻敵人機率 | clamp(0.05 + 0.006×step, 0, 0.45) |

單波敵人數判定為門檻疊加：`roll < 第3隻機率` → 3 隻；否則 `roll < 第3隻+第2隻機率` → 2 隻；否則 1 隻。`waveCount` 最多 2、單波敵人數最多 3（`WAVE_COUNT_MAX`/`ENEMY_COUNT_MAX`）。**BOSS tier 固定 1 wave，不套用此機率判定**（見第 6 節）。

## 6. BOSS 護衛與增援機制

- 每個 archetype 被選為 BOSS 節點的頭目時，會帶上 `bossMinionCount`（0~2，見第 2 節表格）隻 **STRONG_ELITE tier** 數值的小兵護衛，與 Boss 本體同波登場（BOSS 固定 1 wave）。
- 若該 archetype 的 `canReinforce` 為真，戰鬥中每滿 `BOSS_REINFORCE_CONFIG.CHECK_INTERVAL_ROUNDS`（3）回合檢查一次：Boss 本體存活、目前小兵存活數 < 2、且本場已補位次數 < `MAX_REINFORCEMENTS`（2）時，以 `CHANCE`（50%）機率補上一隻新的 STRONG_ELITE 小兵（同一 archetype）。
- 玩家勝利條件＝Boss 本體與所有小兵全滅。

```
BOSS_REINFORCE_CONFIG = {
  CHECK_INTERVAL_ROUNDS: 3,
  CHANCE: 0.5,
  MAX_REINFORCEMENTS: 2,
}
```

> ASSUMPTION（`server/constants/combat.ts` 註解）：`bossMinionCount`/`canReinforce`/`BOSS_REINFORCE_CONFIG` 三者皆為 `chapter-level-structure` change 自行發明（回合檢查間隔＋固定機率＋補位上限，只為讓模擬長度有界），可自由調整。
>
> **文件落差提醒**：`openspec/specs/combat-engine/spec.md` 目前仍寫「Boss 固定 1 wave、1 隻敵人」，尚未反映上述護衛/補位機制。此機制來自尚未 archive 的 `openspec/changes/chapter-level-structure/`（`tasks.md` 第 4 節「Boss 戰鬥：小兵陣容與補位機制」勾選框仍未打勾），但 `server/constants/combat.ts`、`server/services/combat.service.ts` 已經實作並生效——**本節描述的是目前程式碼的實際行為**，正式 spec.md 尚待該 change 完成測試並 archive 後同步。

## 7. 戰鬥結算與獎勵

| 項目 | 公式 |
|---|---|
| 擊敗單隻敵人 EXP | `enemyLevel × 10 × tier倍率`（NORMAL ×1、ELITE ×2、STRONG_ELITE ×4、BOSS ×8） |
| 擊敗單隻敵人基礎金幣 | `enemyLevel × 2` |
| 金幣依 LUCK 加成 | `round(基礎金幣 × (1 + LUCK × 0.02))` |
| 裝備掉落機率（一般敵人） | `min(0.40, max(0, 0.15 + LUCK × 0.005))` |
| 裝備掉落機率（BOSS 本體） | 100%（保底掉落，不受 LUCK 門檻限制；BOSS 的小兵護衛仍走一般 LUCK 門檻） |
| 掉落裝備稀有度上限（依 tier） | NORMAL → SR、ELITE → SSR、STRONG_ELITE → L、BOSS → L |
| 擊敗至少 1 隻敵人的祝福點數 | NORMAL 1、ELITE 2、STRONG_ELITE 3、BOSS 5（每場戰鬥固定值，非每隻敵人疊加） |
| 戰鬥失敗 | `expGained = 0`，且不產生任何獎勵 |

寶石掉落機率／數量依 `enemyLevel` 分級（`GEMS_DROP_TIERS`，每隻擊敗敵人各自判定一次）：

| enemyLevel 區間 | 掉落機率 | 數量 |
|---|---|---|
| ≤10 | 3% | 1 |
| ≤20 | 6% | 1~3 |
| ≤30 | 10% | 3~5 |
| >30 | 沿用 ≤30 級距（spec.md「enemyLevel 超出已定義範圍」明訂的 fallback 行為） |

RunModifier（Blessing/Curse）會在傷害/防禦/掉落計算前**額外加總**套用在 ATK/DEF/HP_MAX/actionIntervalSec/critChance/critMultiplier/dodgeChance 與掉落機率倍率上，僅影響本場計算、不修改角色永久資料。**目前 `events-and-blessings` change 尚未落地**，`run.blessings`/`run.curses` 還沒有查表機制可解析成實際 RunModifier，`combat.service.ts` 目前永遠傳入空陣列——套用邏輯已寫好但實際上尚未生效（規劃中，尚未落地）。

## 8. 職業技能是否介入戰鬥？

`openspec/specs/character-archetype-abilities/spec.md` 只定義 5 個職業各一筆 `ArchetypeAbility` 靜態資料（`trigger` 列舉：`blessing_effect_boost`/`non_combat_node_bonus`/`enemy_encounter_record`/`salvage_material_drop`/`risk_reward_choice`），供消費端系統「查表使用」，**該 spec 明確不定義任何機率/倍率/數值，實際效果由消費端各自的 change 實作**。目前 `server/services/combat.service.ts` 沒有任何程式碼讀取或消費 `ArchetypeAbility`（已檢索確認無引用）——換言之，**5 個職業目前對戰鬥計算沒有任何實際數值影響**。唯一敘事上與戰鬥相關的是工匠 Tinkerer 的 `salvage_material_drop`（擊敗機械類敵人有機率獲得可轉化素材），但運算邏輯待確認由哪個未來 change 接入 combat 側。

## 9. 前端呈現：戰鬥紀錄逐筆播放（規劃中，部分完成）

`openspec/changes/combat-log-sequential-playback/` change：前端 `combatResultPanel.vue` 依 `combatLog` 相鄰事件的 `timestamp` 差值排程逐批顯示（同一 `timestamp` 的多筆事件同時顯示），戰鬥摘要延後到最後一批播放完畢才顯示。`tasks.md` 顯示播放邏輯（1.1~1.3）已完成並打勾，但手動瀏覽器驗證（2.1）與 spec 同步/archive（3.2）尚未完成，change 尚未 archive。**純前端呈現層改動，不影響後端戰鬥運算/數值**（伺服器端邏輯與 API 回應格式不變）。

## 落地備註

- 第 6 節「BOSS 護衛與增援機制」是程式碼已生效、但正式 `spec.md` 尚未同步的內容，之後 `chapter-level-structure` change 完成測試並 archive 後，需重新核對本文件與新版 spec.md 是否一致。
- 第 8 節職業技能與戰鬥的整合目前完全空白，若未來要讓 Tinkerer 的 Salvage 或其他職業特色真的影響戰鬥數值，需要新的 change 定案機率/倍率並接進 `combat.service.ts`。
- 標示 ASSUMPTION 的所有數值（敵人 archetype 基礎值、BOSS 倍率、BOSS 補位機制參數）皆非最終平衡數字，調整時不需要額外找「原始設計依據」，因為它們本來就是對應 change 自行發明的暫定值。
