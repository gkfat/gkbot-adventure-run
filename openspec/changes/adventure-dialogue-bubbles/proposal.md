## Why

冒險頁面目前的戰鬥/事件演出只有數值回饋（傷害飄字、閃避文字、HP/行動條），玩家與敵人在遭遇、攻擊、受擊、爆擊、治療、各類事件時完全沉默，角色與敵人archetype之間也毫無性格差異，降低了戰鬥與事件的臨場感與角色辨識度。參考 `logicard-duel` 的 mumble 機制（依角色資料驅動的對話氣泡），為本專案的冒險流程加入依角色/敵人 archetype 差異化的對話氣泡，強化演出張力與角色個性。

## What Changes

- 新增對話氣泡 UI 元件，錨定於玩家角色（`characterStage` 的 sprite-wrap）與各敵人卡片（`combatResultPanel` 的 fx-anchor），顯示簡短台詞、自動淡出。
- 新增依「觸發類型 × 陣營/archetype」分類的台詞資料表：涵蓋遭遇敵人（戰鬥開始）、攻擊命中、爆擊、受到攻擊、閃避、擊敗敵人/被擊敗、以及事件反應（HEAL/BLESSING/CURSE/WHEEL/CHOICE 各結果）。
- 新增台詞選取邏輯：同一角色/敵人在同一觸發類型下有多句台詞時隨機挑選，並避免同一次戰鬥/事件內連續重複同一句。
- 玩家角色依 5 種 `CharacterArchetype`（戰士/冒險家/學者/工匠/投機者）提供各自語氣的台詞；敵人依 `EnemyArchetype`（含 boss）提供各自台詞，兩者皆有共用的通用台詞池作為 fallback（archetype 沒有對應觸發類型專屬台詞時使用）。
- 整合進既有戰鬥演出時間軸（`useCombat.ts` 的 `visibleGroupCount` watch）與事件結算流程，氣泡顯示不得阻塞或延遲現有的傷害飄字/閃避文字/HP 更新等既有演出時序。
- 同一時間同一單位只顯示一則氣泡（新台詞觸發時取代舊台詞），不做多氣泡佇列。

## Capabilities

### New Capabilities
- `dialogue-bubbles`: 對話氣泡 UI 元件、觸發類型定義、台詞資料模型（玩家 archetype / 敵人 archetype / 通用池）、隨機選取與防重複規則。

### Modified Capabilities
- `adventure-run-presentation`: 新增需求 — 戰鬥演出（`combatLog` 的 ATTACK/CRIT/DODGE/DEATH）與事件結算（`EventResult` 的 HEAL/BLESSING/CURSE/WHEEL/CHOICE）需觸發對應單位的對話氣泡，且氣泡演出不得阻塞既有時間軸。

## Impact

- **新增**：`app/components/game/adventure/dialogueBubble.vue`（或類似命名）、台詞資料表（`app/constants/` 或 `shared/constants/` 下新檔）、可能新增 `app/composables/useDialogueBubble.ts`。
- **修改**：`app/composables/useCombat.ts`（在既有 fx 觸發點旁掛上氣泡觸發）、`app/components/game/adventure/combatResultPanel.vue`（敵方卡片渲染氣泡）、`app/components/game/character-stage/characterStage.vue`（玩家角色渲染氣泡）、`app/components/game/adventure/eventResultDialog.vue` 或其開啟流程（事件結果觸發氣泡）。
- **不涉及**：伺服器端戰鬥/事件解決邏輯（`combat.service.ts`、`event.service.ts`）不需變更，台詞資料與觸發皆為前端純演出邏輯，`CombatLogEntry`/`EventResult` 既有欄位已足夠判斷觸發類型。
- **相依資料擴充**：`CharacterArchetype`、`EnemyArchetype` 型別可能需新增台詞相關欄位或改為外部對照表（設計階段決定）。
