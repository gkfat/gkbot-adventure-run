## ADDED Requirements

### Requirement: 戰鬥與事件演出觸發對話氣泡且不阻塞既有時間軸
系統 SHALL 在戰鬥演出（`combatLog` 播放至 `ATTACK`/`CRIT`/`DODGE`/`DEATH` 事件）與事件結算（`EventResult` 為 `HEAL`/`BLESSING`/`CURSE`/`WHEEL`/`CHOICE` 類型）時，觸發對應主體（玩家或敵人）的對話氣泡；對話氣泡的顯示與淡出 SHALL 為獨立關注點，不得阻塞或延遲既有的傷害飄字、閃避文字、HP/行動條更新、banner 等演出時間軸。

#### Scenario: 攻擊命中同時觸發傷害飄字與對話氣泡
- **WHEN** `combatLog` 播放至一筆 `action: 'ATTACK'` 事件，且該次觸發中選顯示對話氣泡
- **THEN** 受擊目標旁同時顯示傷害飄字與（若中選）攻守雙方各自的對話氣泡，兩者互不阻塞彼此的顯示時機

#### Scenario: 對話氣泡演出不延遲時間軸推進
- **WHEN** 對話氣泡的淡出動畫尚未播放完畢
- **THEN** 戰鬥演出時間軸依既定排程繼續播放後續 `combatLog` 批次，不因氣泡尚未消失而暫停

#### Scenario: 遭遇敵人時觸發氣泡
- **WHEN** 玩家的冒險運行進入 COMBAT/ELITE/STRONG_ELITE/BOSS 節點並顯示敵人預覽
- **THEN** 系統觸發敵人一方的 `ENCOUNTER` 對話氣泡（若該敵人身份有可用台詞）

#### Scenario: 事件結算觸發玩家對話氣泡
- **WHEN** `POST /api/adventure/event/resolve` 回傳的 `EventResult.type` 為 `HEAL` 且 `hpHealed` 有值
- **THEN** 系統觸發玩家角色的 `HEAL` 對話氣泡（若玩家身份有可用台詞）
