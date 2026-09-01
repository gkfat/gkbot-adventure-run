# item-generation

## Purpose

物品生成引擎：依 `ItemTemplate`（`server/constants/templates.ts`，不落 Firestore 的靜態常數）與稀有度規則 roll 出全域唯一的 Item Instance，生成即持久化到獨立的 `items` collection；模板命名與描述文案依 `docs/worldview.md` 世界觀設計。供商店上架（`shop` change）與冒險掉落（`combat-engine` change）共用同一份邏輯。

## Requirements

### Requirement: 依模板與稀有度生成物品實體
系統 SHALL 於掉落或商店上架當下，依 `templateId` 與其 `rarityWeights` roll 出稀有度（N/R/SR/SSR/L），再依該稀有度的數值區間 roll 出 `rolledStats`（`type: EQUIPMENT` 使用 `baseStatsRange`；`type: POTION` 使用 `healPercentRange`），產生具全域唯一 `itemId` 的 Item Instance，並標記 `source`（DROP/SHOP/EVENT）。

#### Scenario: 生成物品實體
- **WHEN** 呼叫 `generateItemInstance('salvaged_wrench', { source: 'SHOP' })`
- **THEN** 回傳的 ItemInstance 有唯一 `itemId`、`templateId = 'salvaged_wrench'`、`rarity` 落在該模板定義的稀有度集合內、`rolledStats` 落在對應稀有度的 `baseStatsRange` 內

#### Scenario: 稀有度越高數值越好
- **WHEN** 同一 templateId 分別生成 rarity=N 與 rarity=SSR 的實體
- **THEN** SSR 實體的 `rolledStats` 數值上下界皆高於 N 實體的對應區間

#### Scenario: 未知 templateId 拒絕生成
- **WHEN** 呼叫 `generateItemInstance` 時傳入不存在的 templateId
- **THEN** 系統拋出錯誤，不回傳半成品物品

#### Scenario: 生成藥水物品
- **WHEN** 呼叫 `generateItemInstance('engine_oil_basic', { source: 'DROP' })`，該模板 `type = POTION`
- **THEN** 回傳的 ItemInstance 有 `type = POTION`、`rolledStats.healPercent` 落在對應稀有度的 `healPercentRange` 內，且不含 ATK/DEF 等裝備數值

### Requirement: 生成即持久化到獨立的 items collection
系統 SHALL 將生成的每一個物品實體視為全域唯一，寫入獨立的頂層 Firestore collection `items/{itemId}`（文件 id 即 `itemId`），而非內嵌複製於背包、裝備欄位等各個容器內；裝備（`type: EQUIPMENT`）與藥水（`type: POTION`）皆是 `items` collection 裡的一筆文件，僅以 `type` 欄位區分，其餘容器（永久背包、角色裝備欄位）此後只透過 `itemId` 參照這份唯一文件。

#### Scenario: 物品交付玩家時寫入 items collection
- **WHEN** 系統將一個生成好的物品實體交付給某個角色（例如放入永久背包）
- **THEN** `items/{itemId}` 文件被建立，欄位包含 `templateId`、`type`、`equipSlot`（僅 EQUIPMENT）、`rarity`、`stats`、`source`、擁有者 `characterId`、`createdAt`

#### Scenario: 容器只存參照
- **WHEN** 查詢任何持有該物品的容器（例如永久背包文件）
- **THEN** 該容器內只看到 `itemId` 字串，而非完整的物品欄位；完整物品資料只存在於 `items/{itemId}` 這一份文件

### Requirement: 物品模板文案符合世界觀
系統 SHALL 為每個 `type: EQUIPMENT` 的 `ItemTemplate` 提供依稀有度（N/R/SR/SSR/L）各自獨立的 `name`（中文）與 `description` 欄位，內容依 `docs/game-design/content/items.md` 第 4 節「稀有度文案對照」定案填入；`type: POTION` 模板的 `name`/`description` 維持單一字串，不分稀有度。系統 SHALL 於 `generateItemInstance()` 依 rolled rarity 從對應的 `name`/`description`（EQUIPMENT）或固定字串（POTION）取值，並固化寫入回傳的 `ItemInstance`/`RolledItem`；藥水類模板的 `description` SHALL 以暗示、不明講的方式帶出玩家角色局部機械化的違和感，其餘模板命名與描述 SHALL 呼應「裂域」（GK 公司廢棄設施）場景素材。

#### Scenario: 同一 template 不同稀有度顯示不同文案
- **WHEN** 分別呼叫 `generateItemInstance('salvaged_wrench', { source: 'DROP' })` 直到分別 roll 出 rarity=N 與 rarity=L 的實體
- **THEN** 兩個實體的 `name`/`description` 不同，且分別等於 `docs/game-design/content/items.md` 第 4 節「右手 Right Hand」對照表中 N 稀有度、L 稀有度所定案的文案

#### Scenario: 已生成物品的文案不受 template 調整影響
- **WHEN** 一個 `ItemInstance` 已生成（`name`/`description` 已固化），之後 `ITEM_TEMPLATES` 中對應 template 的文案被修改
- **THEN** 該已生成 `ItemInstance` 的 `name`/`description` 維持生成當下固化的值，不隨 template 變動

#### Scenario: 藥水描述不可明講機械化設定
- **WHEN** 檢視任一 `type: POTION` 模板的 `description`
- **THEN** 文案呈現角色對「喝機油/工業液體卻能回血」的疑惑與不抗拒，但不出現「機械人」「半機械化」等明講字眼

#### Scenario: 裝備命名呼應裂域設施素材
- **WHEN** 檢視任一 `type: EQUIPMENT` 模板在任一稀有度下的 `name`/`description`
- **THEN** 命名或描述可辨識出與補給設施拾荒、維修設施殘存 GkBot 零件、研究設施實驗品等世界觀場景的關聯，而非通用奇幻道具命名

### Requirement: 物品實體攜帶重量分類
系統 SHALL 在生成 `type: EQUIPMENT` 道具的物品實體時（不限 `equipSlot`），將該 template 的 `weaponWeightClass` 一併帶入 `ItemInstance`，供裝備欄位、戰鬥計算與前端顯示直接讀取，不需額外查詢 template。

#### Scenario: 生成 HAND 類物品實體帶出重量分類
- **WHEN** 呼叫 `generateItemInstance('salvaged_wrench', { source: 'DROP' })`，該 template 定義 `weaponWeightClass = MEDIUM`
- **THEN** 回傳的 `ItemInstance.weaponWeightClass = 'MEDIUM'`

#### Scenario: 生成非 HAND 槽位 EQUIPMENT 物品實體也帶出重量分類
- **WHEN** 呼叫 `generateItemInstance('gkbot_faceplate', { source: 'DROP' })`（`equipSlot = HEAD`），該 template 定義 `weaponWeightClass = MEDIUM`
- **THEN** 回傳的 `ItemInstance.weaponWeightClass = 'MEDIUM'`

#### Scenario: 非 EQUIPMENT 類物品實體不含重量分類
- **WHEN** 呼叫 `generateItemInstance('engine_oil_basic', { source: 'DROP' })`（`type = POTION`）
- **THEN** 回傳的 `ItemInstance` 不含 `weaponWeightClass` 欄位

### Requirement: rolledStats 依重量分類納入 dodgeChanceMod
系統 SHALL 在 `type: EQUIPMENT` 且 `weaponWeightClass = HEAVY` 的物品生成時，依該稀有度的 `baseStatsRange.dodgeChanceMod` 區間 roll 出負值加入 `rolledStats`；非 `HEAVY` 分類的物品 `rolledStats` SHALL NOT 含 `dodgeChanceMod`。

#### Scenario: HEAVY 物品的 rolledStats 含閃避懲罰
- **WHEN** 生成一個 `weaponWeightClass = HEAVY` 的物品實體
- **THEN** `rolledStats.dodgeChanceMod` 為負值，且落在該稀有度定義的區間內

#### Scenario: 非 HEAVY 物品的 rolledStats 不含 dodgeChanceMod
- **WHEN** 生成一個 `weaponWeightClass = LIGHT` 或 `MEDIUM` 的物品實體
- **THEN** `rolledStats` 不含 `dodgeChanceMod` 欄位
