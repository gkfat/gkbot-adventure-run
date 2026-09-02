## ADDED Requirements

### Requirement: combatLog 記錄技能事件
系統 SHALL 在 `CombatLogEntry.action` 新增 `SKILL` 列舉值，代表某單位當次行動發動了技能而非普通攻擊；`SKILL` 事件 SHALL 額外包含 `skillId`、`skillName` 欄位，並沿用既有 `damage`/`targetHpRemaining` 欄位表達傷害/治療類效果的結果（`HEAL_SELF` 效果的 `targetId` SHALL 等於 `actorId`）。

#### Scenario: 傷害類技能事件記錄
- **WHEN** 一個單位發動 `BONUS_DAMAGE` 類技能並命中目標
- **THEN** `combatLog` 新增一筆 `action = 'SKILL'` 的事件，包含 `skillId`/`skillName`、`damage`、`targetHpRemaining`

#### Scenario: 自我治療技能事件記錄
- **WHEN** 一個單位發動 `HEAL_SELF` 類技能
- **THEN** `combatLog` 新增一筆 `action = 'SKILL'` 的事件，`targetId` 等於施放者自己的 `actorId`

## MODIFIED Requirements

### Requirement: 冒險畫面顯示戰鬥結果
系統 SHALL 讓玩家在 COMBAT 節點的冒險畫面上主動觸發戰鬥；戰鬥完成後，冒險畫面 SHALL 依 `combatLog` 各筆事件的 `timestamp`（相對戰鬥時間，ms）逐筆／逐批播放戰鬥紀錄，而不是一次性全部顯示：相鄰兩批事件之間的等待時間 SHALL 等於兩者 `timestamp` 的差值，同一個 `timestamp` 的多筆事件 SHALL 視為同一批同時顯示；`combatSummary`（勝負、回合數、EXP、金幣、寶石、掉落物）SHALL 在最後一批戰鬥紀錄顯示完畢後才呈現。播放期間，冒險畫面 SHALL 顯示一份敵人狀態面板（依目前已播放的批次即時反映每隻敵人的階級、名稱、目前 HP／最大 HP），並 SHALL 以旋轉動畫（rotate-spinner）視覺化呈現距離下一批戰鬥紀錄顯示的倒數；旋轉一圈的動畫時長 SHALL 等於目前批次到下一批次之間的等待時間。`combatLog` 中 `action = 'SKILL'` 的事件 SHALL 併入同一套逐批播放排程（依 `timestamp` 排批，不需要獨立的播放機制），播放文案 SHALL 顯示技能名稱（`skillName`）與效果摘要（傷害/治療數值，依既有 `damage`/`targetHpRemaining` 欄位呈現）。

#### Scenario: 玩家觸發戰鬥
- **WHEN** 玩家在冒險畫面的 COMBAT 節點點擊「開始戰鬥」
- **THEN** 系統呼叫 `POST /api/adventure/combat/start`，取得完整 `combatLog` 與 `combatSummary` 後開始逐批播放

#### Scenario: 技能事件併入既有播放排程
- **WHEN** `combatLog` 中包含 `action = 'SKILL'` 的事件
- **THEN** 該事件依其 `timestamp` 與其他 `ATTACK`/`CRIT`/`DODGE`/`DEATH` 事件一起排入既有的逐批播放序列，顯示技能名稱與效果摘要，敵人狀態面板依 `targetHpRemaining` 即時更新
