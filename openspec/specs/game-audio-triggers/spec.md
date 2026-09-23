# game-audio-triggers Specification

## Purpose
TBD - created by archiving change game-audio-integration. Update Purpose after archive.
## Requirements
### Requirement: 依冒險狀態自動切換 BGM
系統 SHALL 依玩家目前所在頁面是否為冒險頁（`/adventure`）自動播放對應的背景音樂，並在離開遊戲內頁面（登出）時停止播放。

#### Scenario: 進入非冒險頁面播放城鎮 BGM
- **WHEN** 玩家在遊戲內頁面（`/main`、`/shop`、`/inventory`、`/quests`、`/talents`、`/gacha`）
- **THEN** 系統播放 `bgm/town.mp3`（若尚未播放）

#### Scenario: 進入冒險頁面播放冒險 BGM
- **WHEN** 玩家導覽至 `/adventure`
- **THEN** 系統播放 `bgm/adventure.mp3`，取代原本播放的 BGM

#### Scenario: 從冒險頁面返回其他遊戲頁面
- **WHEN** 玩家從 `/adventure` 導覽回其他遊戲內頁面
- **THEN** 系統播放 `bgm/town.mp3`，取代 `bgm/adventure.mp3`

#### Scenario: 登出停止播放
- **WHEN** 玩家登出，離開遊戲內頁面
- **THEN** 系統停止播放目前的 BGM

### Requirement: 裝備與購買動作播放音效
系統 SHALL 在裝備穿上、裝備脫下、商店購買（含道具購買與技能碎片購買）成功後播放 `sfx/equip.mp3`。

#### Scenario: 裝備成功
- **WHEN** 玩家將道具裝備到角色身上且 API 呼叫成功
- **THEN** 系統播放 `sfx/equip.mp3`

#### Scenario: 卸下裝備成功
- **WHEN** 玩家卸下角色身上的裝備且 API 呼叫成功
- **THEN** 系統播放 `sfx/equip.mp3`

#### Scenario: 購買成功
- **WHEN** 玩家在商店購買道具或技能碎片且 API 呼叫成功
- **THEN** 系統播放 `sfx/equip.mp3`

### Requirement: 開始探索播放音效
系統 SHALL 在玩家成功由角色主畫面導覽進入冒險頁時播放 `sfx/exploreStart.mp3`。

#### Scenario: 開始探索成功
- **WHEN** 玩家點擊「開始探索」且系統確定導覽至 `/adventure`
- **THEN** 系統播放 `sfx/exploreStart.mp3`

### Requirement: 獲得金幣播放音效
系統 SHALL 在玩家領取任務獎勵或販售裝備成功獲得金幣時播放 `sfx/gold.mp3`。

#### Scenario: 領取任務獎勵成功
- **WHEN** 玩家領取每日或常駐任務獎勵且 API 呼叫成功
- **THEN** 系統播放 `sfx/gold.mp3`

#### Scenario: 販售裝備成功
- **WHEN** 玩家販售裝備且 API 呼叫成功獲得金幣
- **THEN** 系統播放 `sfx/gold.mp3`

### Requirement: 技能升級播放音效
系統 SHALL 在玩家解鎖新技能或強化既有技能成功時播放 `sfx/skillLevelUp.mp3`。

#### Scenario: 解鎖技能成功
- **WHEN** 玩家解鎖一個新技能且 API 呼叫成功
- **THEN** 系統播放 `sfx/skillLevelUp.mp3`

#### Scenario: 強化技能成功
- **WHEN** 玩家強化一個既有技能且 API 呼叫成功
- **THEN** 系統播放 `sfx/skillLevelUp.mp3`

### Requirement: 天賦加點播放音效
系統 SHALL 在玩家成功投入天賦點數時播放 `sfx/talentPoint.mp3`。

#### Scenario: 天賦加點成功
- **WHEN** 玩家對一個天賦節點投入點數且 API 呼叫成功
- **THEN** 系統播放 `sfx/talentPoint.mp3`

### Requirement: 戰鬥與跨戰鬥增益/減益播放音效
系統 SHALL 在戰鬥中套用增益類技能效果，或玩家取得祝福時播放 `sfx/buff.mp3`；在戰鬥中套用減益/控場類技能效果，或玩家取得詛咒時播放 `sfx/debuff.mp3`。

#### Scenario: 戰鬥中套用增益技能效果
- **WHEN** 戰鬥演出播放到一筆帶有 `HASTE_SELF`、`DEFENSE_UP`、`CRIT_UP` 或 `SHIELD` 效果類型的技能事件
- **THEN** 系統播放 `sfx/buff.mp3`

#### Scenario: 戰鬥中套用減益/控場技能效果
- **WHEN** 戰鬥演出播放到一筆帶有 `FREEZE`、`ARMOR_BREAK` 或 `DOT` 效果類型的技能事件
- **THEN** 系統播放 `sfx/debuff.mp3`

#### Scenario: 取得祝福
- **WHEN** 玩家在冒險中取得祝福（`RunModifier.isBlessing === true`）
- **THEN** 系統播放 `sfx/buff.mp3`

#### Scenario: 取得詛咒
- **WHEN** 玩家在冒險中取得詛咒（`RunModifier.isBlessing === false`）
- **THEN** 系統播放 `sfx/debuff.mp3`

