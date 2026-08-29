## MODIFIED Requirements

### Requirement: 查詢角色列表與角色範本
系統 SHALL 提供 `GET /api/character/roster`，回傳目前登入帳號名下所有角色的摘要清單（含 characterId/nickname/level/archetypeId/className/spriteUrl），以及 5 種可選角色範本（archetype：`fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler`）的定義（archetypeId/className/attributes/spriteUrl）。已停用（retired）的舊職業範本不包含在此回傳清單中。

#### Scenario: 帳號尚無角色
- **WHEN** 帳號從未建立過角色即呼叫 `GET /api/character/roster`
- **THEN** `characters` 回傳空陣列，`archetypes` 回傳 5 個可選範本定義

#### Scenario: 帳號已有角色
- **WHEN** 帳號名下已有 1 筆以上角色即呼叫 `GET /api/character/roster`
- **THEN** `characters` 回傳該帳號名下所有角色的摘要，`archetypes` 仍回傳完整 5 個可選範本定義供建立新角色使用

#### Scenario: 既有單一角色帳號的相容性
- **WHEN** 帳號是在多角色功能上線前建立、只有一筆舊格式角色資料（文件 ID 等於 accountId、缺少 accountId 欄位）
- **THEN** 系統在讀取時自動補上 `accountId` 欄位與 `archetypeId: "legacy"`，並將其併入 `characters` 清單回傳，不影響其既有 level/exp/gold/gems/attributes/nickname/equipment 資料

#### Scenario: 查詢使用已停用職業的舊角色
- **WHEN** 帳號名下有一筆角色的 `archetypeId` 為已停用（retired）的舊職業（`barbarian`/`rogue`/`paladin`/`wanderer`）
- **THEN** 該角色仍正常出現在 `characters` 清單中，其 `className`/`spriteUrl` 維持原職業定義顯示，不受 `archetypes`（可選範本）清單已排除該職業影響

### Requirement: 依範本建立新角色
系統 SHALL 提供 `POST /api/character`，允許玩家指定一個 `archetypeId`（5 種可選範本之一：`fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler`）建立一個新角色，新角色套用該範本的初始屬性分配（STR/AGI/CON/LUCK 加總固定為 8），且與帳號名下其他角色相互獨立（各自的 level/exp/gold/gems/nickname/equipment/unspentAttributePoints）。已停用（retired）的舊職業（`barbarian`/`rogue`/`paladin`/`wanderer`）不可用於建立新角色。

#### Scenario: 成功建立角色
- **WHEN** 帳號目前有 0~2 筆角色，送出合法的可選 `archetypeId`
- **THEN** 系統建立一筆新角色，屬性依範本初始化，`unspentAttributePoints` 為 0，並回傳含 server 計算 stats 的完整角色資料

#### Scenario: 角色數量已達上限
- **WHEN** 帳號目前已有 3 筆角色，仍嘗試建立新角色
- **THEN** 系統回傳 400，且不建立任何新角色

#### Scenario: 不合法的範本
- **WHEN** 送出的 `archetypeId` 不是 5 個可選範本之一
- **THEN** 系統回傳 400，且不建立任何新角色

#### Scenario: 嘗試以已停用職業建立角色
- **WHEN** 送出的 `archetypeId` 是已停用（retired）的舊職業（例如 `barbarian`）
- **THEN** 系統回傳 400，且不建立任何新角色
