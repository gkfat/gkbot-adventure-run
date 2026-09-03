## MODIFIED Requirements

### Requirement: 查詢角色列表與角色範本
系統 SHALL 提供 `GET /api/character/roster`，回傳目前登入帳號名下所有角色的摘要清單（含 characterId/nickname/level/archetypeId/className/spriteUrl），以及 5 種可選角色範本（archetype：`fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler`）的定義（archetypeId/className/attributes/spriteUrl）。

#### Scenario: 帳號尚無角色
- **WHEN** 帳號從未建立過角色即呼叫 `GET /api/character/roster`
- **THEN** `characters` 回傳空陣列，`archetypes` 回傳 5 個可選範本定義

#### Scenario: 帳號已有角色
- **WHEN** 帳號名下已有 1 筆以上角色即呼叫 `GET /api/character/roster`
- **THEN** `characters` 回傳該帳號名下所有角色的摘要，`archetypes` 仍回傳完整 5 個可選範本定義供建立新角色使用

#### Scenario: 既有單一角色帳號的相容性
- **WHEN** 帳號是在多角色功能上線前建立、只有一筆舊格式角色資料（文件 ID 等於 accountId、缺少 accountId 欄位）
- **THEN** 系統在讀取時自動補上 `accountId` 欄位與 `archetypeId: "legacy"`，並將其併入 `characters` 清單回傳，不影響其既有 level/exp/gold/gems/attributes/nickname/equipment 資料

### Requirement: 依範本建立新角色
系統 SHALL 提供 `POST /api/character`，允許玩家指定一個 `archetypeId`（5 種可選範本之一：`fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler`）建立一個新角色，新角色套用該範本的初始屬性分配（STR/AGI/CON/LUCK 加總固定為 8），且與帳號名下其他角色相互獨立（各自的 level/exp/gold/gems/nickname/equipment/unspentAttributePoints）。

#### Scenario: 成功建立角色
- **WHEN** 帳號目前有 0~2 筆角色，送出合法的可選 `archetypeId`
- **THEN** 系統建立一筆新角色，屬性依範本初始化，`unspentAttributePoints` 為 0，並回傳含 server 計算 stats 的完整角色資料

#### Scenario: 角色數量已達上限
- **WHEN** 帳號目前已有 3 筆角色，仍嘗試建立新角色
- **THEN** 系統回傳 400，且不建立任何新角色

#### Scenario: 不合法的範本
- **WHEN** 送出的 `archetypeId` 不是 5 個可選範本之一
- **THEN** 系統回傳 400，且不建立任何新角色

<!--
移除說明（併入上方 MODIFIED Requirements 的完整內容，非獨立 Requirement 移除）：
- 原「查詢角色列表與角色範本」情境「查詢使用已停用職業的舊角色」已移除。
  Reason: barbarian/rogue/paladin/wanderer 4 個已停用職業的 template 已直接自
  server/constants/templates/characterArchetypes.ts 刪除，不再保留「已停用職業」概念與相容查表邏輯。
  Migration: 無自動遷移；若既有 Firestore 角色資料的 archetypeId 為這 4 個已移除的舊職業，
  其角色頁 className/spriteUrl 查表將查無資料，此風險已由專案擁有者確認可接受。
- 原「依範本建立新角色」情境「嘗試以已停用職業建立角色」已移除。
  Reason: 已停用職業概念與 template 整批移除，該情境併入「不合法的範本」情境
  （送出未知 archetypeId 一律回傳 400），不再需要獨立區分「已停用」與「從未存在」兩種無效範本。
  Migration: 無需遷移，行為結果不變（皆回傳 400 且不建立角色）。
-->
