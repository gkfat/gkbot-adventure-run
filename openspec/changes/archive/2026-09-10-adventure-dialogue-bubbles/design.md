## Context

冒險頁面的戰鬥/事件演出目前完全由 `app/composables/useCombat.ts` 驅動：伺服器一次性回傳整場戰鬥的 `combatLog: CombatLogEntry[]`（`action: 'ATTACK' | 'CRIT' | 'DODGE' | 'DEATH'`），client 用一份絕對時間軸排程逐批「揭露」，並在 `watch(visibleGroupCount, ...)` 裡對涉及單位觸發一次性特效（`cardFx`/`sparkFx`/`damageTextFx`，各自是 `Map<unitId, Fx>` + `setTimeout` 清除的 pattern）。玩家角色是 `characterStage.vue` 裡的持久化大圖（`character-stage__sprite-wrap` 錨點），敵人是 `combatResultPanel.vue` 裡逐張的卡片（`combat-result-panel__fx-anchor` 錨點）。事件結算（`EventType.HEAL/BLESSING/CURSE/WHEEL/CHOICE`）則是另一條路徑：`eventResultDialog.vue` 顯示結果，不經過 `useCombat.ts` 的時間軸。

參考專案 `logicard-duel` 用 Pinia store 的 `mumbleContent` ref + `v-snackbar`（connected 錨點）實作對話氣泡，台詞資料依「觸發類型 × 角色 template」分組、均勻隨機挑選，無佇列（新台詞直接覆蓋舊台詞）。本專案不採用 Vuetify snackbar，理由見下方 Decisions。

角色/敵人身份資料現況：玩家有 5 個固定 `CharacterArchetype`（`server/constants/templates/characterArchetypes.ts`），敵人有 32 個 `EnemyArchetype`（含一般/boss，`server/constants/templates/enemies.ts`，以 `slug` 唯一識別）。兩者目前都沒有「性格/語氣」相關欄位。

## Goals / Non-Goals

**Goals:**
- 在既有戰鬥時間軸與事件結算流程中，加入依角色/敵人 archetype 差異化的對話氣泡演出。
- 氣泡演出為純前端呈現邏輯，不影響伺服器戰鬥/事件計算、不消耗 `deterministic-rng` 的 seed/rngIndex。
- 台詞資料可漸進式擴充（先上通用池 fallback，之後逐步補齊各 archetype 專屬台詞），不阻塞本次上線。

**Non-Goals:**
- 不做多氣泡佇列/堆疊顯示（同單位同時最多一則氣泡，新台詞直接取代舊台詞，比照 logicard-duel）。
- 不做語音/音效（`soundPop()` 之類）——本次僅視覺文字氣泡。
- 不新增伺服器欄位或 API（`CombatLogEntry`/`EventResult` 既有欄位已足夠判斷觸發類型與主體）。
- 不要求為全部 32 個敵人 archetype 一開始就撰寫專屬台詞；未列出的 archetype 一律 fallback 至陣營通用池。

## Decisions

### 1. 氣泡 UI 用自製絕對定位元件，不用 Vuetify `v-snackbar`
`logicard-duel` 用 `v-snackbar` 的 connected 錨點策略；但本專案既有的戰鬥特效（`sparkFx.vue`、傷害飄字）全部是自製的絕對定位 + CSS animation，並套用 `font-pixel`／像素風樣式，走的是完全不同的視覺系統。跟隨既有慣例，新增 `dialogueBubble.vue`：純渲染元件，`props: { text: string | null }`，內部只負責定位（`position: absolute`，錨點為父層 `position: relative` 容器）、氣泡尾巴造型與進出場 CSS animation，不含業務邏輯。
- 替代方案：沿用 `v-snackbar`。放棄理由：視覺風格與既有像素風特效不一致，且 Vuetify overlay 的 z-index/teleport 行為與現有 `fx-anchor` 內其他絕對定位子元素（`sparkFx`、`damageText`）疊放時機更難對齊。

### 2. 觸發類型集合與訊號來源
定義 `DialogueTrigger`（純前端型別，不進 `shared/types`）：

| Trigger | 訊號來源 | 說明 |
|---|---|---|
| `ENCOUNTER` | 進入 COMBAT/ELITE/STRONG_ELITE/BOSS 節點、`EnemyPreview` 顯示時 | 遭遇敵人 |
| `ATTACK` | `combatLog` entry `action: 'ATTACK'`，主體 = `actorId` | 攻擊命中 |
| `CRIT` | `combatLog` entry `action: 'CRIT'`，主體 = `actorId` | 爆擊命中 |
| `HIT_TAKEN` | 同一筆 `ATTACK`/`CRIT` entry，主體 = `targetId` | 受到攻擊 |
| `DODGE` | `combatLog` entry `action: 'DODGE'`，主體 = `targetId` | 成功閃避 |
| `DEFEATED` | `combatLog` entry `action: 'DEATH'`，主體 = `targetId` | 該單位被擊敗（含玩家） |
| `VICTORY` | 戰鬥結算 `CombatResult.victory === true`，主體 = 玩家 | 戰鬥勝利 |
| `HEAL` | `EventResult.hpHealed` 有值，主體 = 玩家 | 治療事件 |
| `BLESSING` | `EventResult.blessingGranted` 有值，主體 = 玩家 | 獲得祝福 |
| `CURSE` | `EventResult.curseApplied` 有值，主體 = 玩家 | 中詛咒 |
| `WHEEL` | `EventType.WHEEL` 結果，主體 = 玩家 | 轉盤結果（不細分中獎/摃龜，文案本身可寫兩極） |
| `CHOICE` | `EventType.CHOICE` 結果，主體 = 玩家 | 風險抉擇結果 |

不新增 `HEAL_IN_COMBAT`：現行 `combat.service.ts` 沒有戰鬥中治療的 log action（`CombatLogEntry.action` 只有 ATTACK/CRIT/DODGE/DEATH），「治療時」的反應對應到 EVENT 節點的 `HEAL` 事件，非戰鬥中行為。若未來 combat-engine 新增治療行動，屬於獨立 change，屆時再擴充 `DialogueTrigger`。

### 3. 台詞資料模型與存放位置
新增 `app/constants/dialogueLines.ts`（比照既有 `adventureNarrative.ts` 的純前端 flavor-text 慣例，不放進 `shared/`，因為不需要伺服器端使用）：

```ts
type DialogueLineSet = Partial<Record<DialogueTrigger, string[]>>;

// 玩家：以 CharacterArchetype.archetypeId 為 key，缺項 fallback 至 GENERIC_PLAYER_LINES
const PLAYER_DIALOGUE_LINES: Record<string, DialogueLineSet> = { fighter: {...}, adventurer: {...}, ... };
const GENERIC_PLAYER_LINES: DialogueLineSet = {...};

// 敵人：以 EnemyArchetype.slug 為 key，缺項 fallback 至陣營通用池
const ENEMY_DIALOGUE_LINES: Record<string, DialogueLineSet> = { ... };
const GENERIC_ENEMY_LINES_BY_FACTION: Record<EnemyFaction, DialogueLineSet> = { HUMAN: {...}, GKBOT: {...} };
```
查找順序：archetype 專屬 → 該 trigger 為空則 fallback 至通用池 → 通用池該 trigger 仍為空則不顯示氣泡（不強塞不相關文案）。

- 替代方案：在 `CharacterArchetype`/`EnemyArchetype` 型別上直接加 `dialogueLines` 欄位（比照 `logicard-duel` 把 `mumbleList` 掛在 `CharacterTemplate` 上）。放棄理由：這兩個型別定義在 `server/constants/templates/`，屬於伺服器端戰鬥數值權威資料；純前端演出文案混進伺服器常數會模糊 `server`/`app`/`shared` 的分層職責（見專案 CLAUDE.md 的 Separation of Concerns），且 `EnemyArchetype`/`CharacterArchetype` 已有既有測試鎖定欄位/數量，不宜為演出需求變動。改用前端獨立對照表，以 `archetypeId`/`slug` 字串關聯即可。

### 4. 台詞挑選與防重複邏輯
`app/composables/useDialogueBubble.ts`（新增）維護：
- `bubbles: reactive<Map<subjectId, { text: string; key: number }>>`（`subjectId` = `'player'` 或 `enemyId`），供元件依 key 掛載/重播 CSS animation。
- `lastLineIndex: Map<`${subjectId}:${trigger}`, number>`：同一主體同一 trigger 若題庫長度 > 1，避免連續兩次抽到相同索引（均勻隨機重抽一次，抽到相同就往後移一格，不做加權/冷卻歷史）。
- 顯示時長：固定 2.4s 自動淡出，同主體有新氣泡觸發時直接以新 `key` 覆蓋（沿用 `cardFx`/`sparkFx` 的 `Map.set + setTimeout` 清除 pattern，見 `useCombat.ts` 既有寫法）。

選字用 `Math.random()`，不經過 `RngService`／不消耗 run 的 `rngIndex`——純演出文案的隨機性與 `deterministic-rng` spec 定義的「run 內所有隨機性」（節點生成/戰鬥/事件的數值判定）無關，比照 `pickIntroNarrative` 之外的另一種前端專用隨機（`pickIntroNarrative` 用 seed 是因為要在同一節點重繪時保持一致，氣泡則每次觸發都是新的一次性演出，不需要重放一致性）。

### 5. 頻率節流：避免高頻攻擊洗版
`ATTACK`（一般命中，非爆擊）觸發時，僅有機率顯示氣泡（初始值 35%，可調），`CRIT`/`DEFEATED`/`ENCOUNTER`/`VICTORY`/事件類 trigger 一律必顯示（重要性高、頻率低）。`HIT_TAKEN`/`DODGE` 跟隨對應 `ATTACK`/`CRIT` 的顯示與否連動（同一筆 entry 若攻擊方沒中選顯示，受擊方仍可獨立以自己的機率判斷是否顯示——兩者是各自獨立的抽選，不綁定同一次結果）。

### 6. 整合點
- `useCombat.ts` 既有 `watch(visibleGroupCount, ...)` 的 `fireEntry()` 內，在既有 `triggerCardFx`/`triggerSparkFx`/`triggerDamageTextFx` 呼叫旁加入 `triggerDialogue(actorId, ...)`/`triggerDialogue(targetId, ...)`；`DEATH` entry（目前被 `continue` 跳過）改為觸發 `DEFEATED` 對話後才 `continue`（不觸發其餘視覺 fx，僅對話）。
- 進入戰鬥節點顯示 `EnemyPreview` 的畫面（`adventure.vue` 內對應區塊）觸發 `ENCOUNTER`。
- 戰鬥結算揭曉勝負那一刻（`combatEndBannerTiming.goneAt`／既有的 `playbackDone` 判斷點）觸發玩家 `VICTORY`（僅勝利時；戰敗已由 `DEFEATED` 覆蓋玩家角色本身）。
- 事件結算：`eventResultDialog.vue` open（或其上層取得 `EventResult` 的 composable）依 `EventResult` 的 `type` 與是否有對應欄位觸發玩家對話。
- 渲染：`characterStage.vue` 的 `.character-stage__sprite-wrap` 內插入 `<GameAdventureDialogueBubble>`（玩家）；`combatResultPanel.vue` 的 `.combat-result-panel__fx-anchor` 內插入（敵人，逐張卡片各自綁自己的 `enemyId`）。

## Risks / Trade-offs

- **[風險] 高頻戰鬥（多波次、多敵人同時出手）疊加氣泡造成視覺雜訊** → 已用第 5 點的機率節流 + 固定 2.4s 短時效緩解；若上線後仍嫌吵，可再調低 `ATTACK` 顯示機率或加冷卻秒數（不需改架構）。
- **[風險] 台詞內容量大（5 玩家 archetype + 最多 32 敵人 archetype × 多個 trigger）導致本次工作量過大** → 用「archetype 專屬優先、通用池 fallback」設計，初版可只給玩家 5 archetype 與 boss/elite 敵人專屬台詞，一般小兵先全用陣營通用池，台詞可後續獨立補充不需再動邏輯層。
- **[風險] 敵人卡片較窄（多敵人橫向排列時每張卡寬度有限），氣泡文字可能溢出或遮住 HP/行動條** → `dialogueBubble.vue` 設定 `max-width` 並允許換行（非強制單行截斷），氣泡定位在卡片上方而非疊在 HP/行動條區域（比照 `sparkFx`/`damageText` 目前的疊放層級，往上再加一層）。
- **[風險] 事件結算（`eventResultDialog`）目前是 modal dialog，玩家角色本體（`characterStage`）在 dialog 開啟時是否仍可見，會影響氣泡是否能被看到** → 需在 tasks 階段確認 `eventResultDialog` 開啟時 `characterStage` 的可視狀態；若被 dialog 完全遮蔽，退而求其次改在 dialog 內顯示一則小型行內台詞（沿用同一份台詞資料與挑選邏輯，只是渲染位置不同），不影響資料層設計。

## Migration Plan

純新增功能，無資料遷移、無 Firestore schema 變更、無破壞性變更。可直接部署；若需要緊急關閉，移除 `useCombat.ts`/事件結算流程裡的 `triggerDialogue(...)` 呼叫點即可回到現狀（元件與資料表留著不影響其他功能）。

## Open Questions

- 一般小兵（非 boss/elite）是否要有專屬台詞，還是本次就先全部用陣營通用池？（design 傾向後者以控制工作量，設計上兩者都支援，由 tasks/內容撰寫階段決定範圍）
- `eventResultDialog` 開啟時 `characterStage` 的可視性需在實作前用瀏覽器實際確認，決定氣泡是否能直接沿用玩家 sprite 錨點，或需要 dialog 內建替代呈現位置。
- `ATTACK` 初始顯示機率 35% 是否合適，需上線後依實際節奏微調，或改由設計師測玩後決定。
