## MODIFIED Requirements

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
