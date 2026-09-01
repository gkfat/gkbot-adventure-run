# 角色系統（Character / Roster）

> 本文件是內部設計參考文件，彙整 `character-roster`／`character-archetype-abilities` 兩份 spec，加上 `shared/schemas/firestore/character.schema.ts`、`shared/schemas/api/character.schema.ts`、`shared/constants/starterLoadout.ts`、`server/constants/characterArchetypes.ts`、`server/constants/archetypeAbilities.ts`、`server/services/character.service.ts`、`server/repositories/character.repository.ts`、`app/components/game/archetypeGallery.vue`、`app/components/game/characterRoster.vue` 的實際落地邏輯，說明「角色」這個實體本身的資料模型、建立/刪除/名冊管理流程、初始配備，以及前端呈現。屬性成長、等級曲線、屬性→戰鬥數值換算公式等**角色養成**面向已由 `docs/game-design/mechanics/progression.md` 涵蓋，本文件不重複列出，僅在關聯處提及。全部數值直接取自 code，未在 code 中定義的機制標註「待確認」。

## 1. 角色資料模型

Firestore 文件 `characters/{characterId}`（`characterSchema`，`.strict()`，`shared/schemas/firestore/character.schema.ts`）：

| 欄位 | 型別 | 說明 |
|---|---|---|
| `characterId` | `string` | 文件 ID |
| `accountId` | `string` | 擁有者帳號 ID |
| `archetypeId` | `string` | 建立時選擇的職業 id，或 `'legacy'`（多角色系統上線前的舊角色） |
| `className` | `string` | 職業顯示名稱，冗餘存放以避免每次都要查表 |
| `level` / `exp` | `int` | 1~`LEVEL_MAX`(30) / ≥0，成長公式見 `progression.md` |
| `gold` / `gems` | `int` | 0~`RESOURCE_LIMITS.GOLD_MAX/GEMS_MAX - 1` |
| `attributes` | `{ STR, AGI, CON, LUCK }` | 皆為 `int().min(1)`，建立時取自職業初始值 |
| `unspentAttributePoints` | `int` | ≥0，可分配的屬性點，見 `progression.md` §5 |
| `equipment` | `Partial<Record<EquipmentSlot, itemId>>` | 已裝備物品參照（optional） |
| `nextChapterIndex` | `int` | 下一趟 run 的章節主題索引 |
| `currentLevelIndex` / `chapterTotalLevels` | `int` | 章節內關卡進度（chapter-level-structure） |
| `nickname` | `string(1~20)` | 排行榜顯示名稱 |
| `createdAt` / `updatedAt` | `number` | timestamp |

角色的**戰鬥數值**（`ATK`/`DEF`/`HP_MAX`/`actionIntervalSec`/`critChance`/`critMultiplier`/`dodgeChance`/`carryCapacity`）不落地儲存，由 API 回傳時即時計算（`CharacterWithStats`，`shared/types/character.ts`）——公式與裝備加成規則見 `progression.md` §4、§6。

## 2. 職業（Archetype）清單

角色建立時從固定職業清單擇一，職業本身只定義「職業 id、顯示名稱、初始四維屬性、圖檔、是否可選」（`server/constants/characterArchetypes.ts`），不含技能/成長曲線邏輯：

```ts
type CharacterArchetype = {
    archetypeId: string;
    className: string;
    attributes: Attributes; // STR/AGI/CON/LUCK
    spriteUrl: string;
    isSelectable: boolean;
};
```

- 5 個可選職業（`fighter`／`adventurer`／`scholar`／`tinkerer`／`gambler`）+ 4 個已停用（`barbarian`／`rogue`／`paladin`／`wanderer`，`isSelectable: false`，僅供既有舊角色解析 `className`/`spriteUrl`，不可再選）。各職業的初始屬性數值、定位風格、與敘事身分對照，見 `progression.md` §1。
- `LEGACY_ARCHETYPE_ID = 'legacy'`／`LEGACY_CLASS_NAME = '冒險者'`／`LEGACY_SPRITE_URL`：多角色名冊系統上線前建立的角色，沒有 `archetypeId`，讀取時被自我修復（self-heal）成這組 legacy 值（見 §4）。

### 職業核心特色機制（ArchetypeAbility）

每個可選職業恰好定義 1 個核心特色機制（`server/constants/archetypeAbilities.ts`），只定案「穩定 trigger 列舉值 + 玩家文案」，**不含任何機率/倍率數值**——實際數值由消費端（events-and-blessings／items-and-equipment／adventure-run-core／combat-engine）各自的 change 實作。完整對照表見 `progression.md` §2。

## 3. 角色名冊（Roster）

- 每個帳號最多擁有 `CHARACTER_ROSTER_MAX = 3` 個角色（`server/repositories/character.repository.ts`），彼此的 level/exp/gold/gems/nickname/equipment/unspentAttributePoints 完全獨立。
- `GET /api/character/roster` 回傳 `{ characters: CharacterSummary[], archetypes: SELECTABLE_CHARACTER_ARCHETYPES }`——一次把「目前角色列表」與「可建立的職業清單」一起回傳，供前端選單使用。`CharacterSummary` 只含列表呈現需要的精簡欄位（`characterId, nickname, level, gold, gems, archetypeId, className, spriteUrl`）。

## 4. 建立角色

`POST /api/character`（`createCharacterRequestSchema: { archetypeId }`）→ `CharacterService.createCharacterFromArchetype`：

1. 驗證 `archetypeId` 存在且 `isSelectable`，否則丟 `BusinessLogicError('Unknown archetype')`。
2. 驗證帳號現有角色數 < `CHARACTER_ROSTER_MAX`，否則丟 `BusinessLogicError`。
3. `CharacterRepository.createCharacterFromArchetype`：建立角色文件（`level=1, exp=0, gold=0, gems=0`，`attributes` 取自職業初始值，`unspentAttributePoints=0, equipment={}`，章節/關卡索引皆為初始值），預設暱稱由 `generateArchetypeNickname(className, characterId)` 產生，格式 `{職業名稱}{characterId 後 6 碼大寫}`（例如「戰士A1B2C3」），不做唯一性檢查（characterId 本身已唯一，不會與同帳號其他角色撞名）。
4. 發放**初始配備**（見 §5）。
5. 回傳含即時計算 stats 的角色（`CharacterWithStats`）。

## 5. 初始配備（Starter Loadout）

新建角色時自動獲得（`shared/constants/starterLoadout.ts` + `CharacterService.grantStarterLoadout`）：

- **1 件 N 稀有度裝備**，依職業主題化並**直接裝備**到對應欄位：

  | archetypeId | templateId | 裝備部位 | 主題 |
  |---|---|---|---|
  | `fighter` | `riot_shield_scrap` | 左手 | 重型武器 |
  | `adventurer` | `scrap_daggers` | 右手 | 輕型武器 |
  | `scholar` | `gkbot_faceplate` | 頭部 | 中等防具 |
  | `tinkerer` | `salvaged_wrench` | 右手 | 中等武器 |
  | `gambler` | `research_chip_ring` | 戒指 | 加攻速飾品 |

  未收錄於對照表的新職業，退回 `DEFAULT_STARTER_EQUIPMENT_TEMPLATE_ID = 'salvaged_wrench'`。
- **1 瓶 N 稀有度藥水**（`engine_oil_basic` 機油，回復 15~20% 生命值），所有職業共用，放入永久背包（不自動使用）。
- 兩者皆以 `ItemSource.STARTER, maxRarity: Rarity.N` 的生成脈絡呼叫 `InventoryService.grantItem`，裝備件再額外呼叫 `EquipmentService.equipItem` 裝備上去。
- `getStarterLoadoutPreview(archetypeId)` 提供**建立角色前**的唯讀預覽（供 `archetypeGallery.vue` 使用），文案/數值手動對照 `server/constants/templates.ts` 的 N 級文案——兩處需手動同步，程式碼註解已提醒此耦合。

## 6. 查詢、屬性分配、改名

- `GET /api/character/:characterId`：擁有權驗證後回傳 `CharacterWithStats`（stats 即時計算，見 `progression.md` §4/§6）。
- `POST /api/character/:characterId/attributes`（`allocateAttributesRequestSchema`，至少分配 1 點）：分配總量不可超過 `unspentAttributePoints`，超過則 400 且不修改任何資料；只會增加、無洗點/重置機制。
- `POST /api/character/:characterId/nickname`（1~20 字）：覆蓋暱稱，不做重複檢查。

以上三者共用 `CharacterRepository.getByIdForAccount(characterId, accountId)` 做擁有權驗證——查無角色或角色不屬於該帳號，一律回傳 `null`（進而 API 端回 404），不區分「不存在」與「非本人」以避免洩漏資訊。

## 7. 刪除角色

`DELETE /api/character/:characterId` → `CharacterService.deleteCharacter`：

1. 擁有權驗證（同 §6）。
2. 刪除該角色**所有**歷史 adventure run 記錄（`AdventureRunRepository.deleteAllByCharacterId`）。
3. 刪除角色的 inventory 參照列表（`InventoryRepository.delete(characterId)`）——**只移除參照，不刪除 `items/{itemId}` 物品文件本身**（items 集合的孤兒文件目前不做清理）。
4. 刪除角色文件本身（`CharacterRepository.delete`）。

> **文件缺口**：`character-roster`／`character-archetype-abilities`／`character-progression` 三份 OpenSpec spec 目前都未涵蓋「刪除角色」的 Requirement，但端點與 service 邏輯皆已實作並在前端（`characterRoster.vue` 的刪除按鈕 + `deleteCharacterDialog.vue` 確認彈窗）串接完成。建議之後補一個 change 把此行為正式納入 spec。

## 8. 舊角色相容（Legacy）

多角色名冊系統上線前，帳號與角色是 1:1 對應（文件 ID = `accountId`），沒有 `accountId`/`archetypeId`/`className`/`nickname` 欄位。`CharacterRepository.listByAccountId` 在讀取時做「自我修復」（self-heal）：若依 `accountId` 欄位查無角色，改用文件 ID 查找舊格式文件，並補上 `accountId`、`archetypeId: 'legacy'`、`className: LEGACY_CLASS_NAME`、預設暱稱（`generateLegacyDefaultNickname`，格式 `玩家{accountId 後 6 碼大寫}`）。舊角色的 `archetypeId: 'legacy'` 無法查得 `CharacterArchetype`/`ArchetypeAbility`，前端顯示會退回 `LEGACY_SPRITE_URL`（`/images/hero-sprite.png`）。

## 9. 前端呈現

### `archetypeGallery.vue`（選擇角色 / 建立角色畫面）

- 用 `useCharacter()` 取得 `archetypes`（可選職業清單）、`roster`、`loading`、`createCharacter`。
- 職業以 carousel 呈現：可左右切換，選中卡片置中放大，兩側卡片依循環最短路徑差值縮小/漸淡（`cyclicDiff`），視覺上首尾相連形成無限循環；卡片圖使用 `breatheFrameUrl` 呼吸動畫 sprite。
- 說明欄顯示：職業名稱、敘事文案（元件內硬編碼 `ARCHETYPE_BLURB`，5 段皆依 `docs/worldview.md` 的規則——只能透過暗示帶到玩家角色機械化的伏筆，不直接說破）、初始配備預覽（點擊裝備/藥水格子彈出唯讀 dialog，讀 `getStarterLoadoutPreview`）、四維屬性長條圖（滿條基準為 5，`ATTRIBUTE_BAR_MAX`）。
- 「確認」按鈕呼叫 `createCharacter(selected.archetypeId)`；`roster.length > 0` 時額外顯示「返回角色列表」。

### `characterRoster.vue`（角色列表畫面）

- 用 `useCharacter()` 的 `roster`、`rosterFull`、`selectCharacter`。
- 每列顯示 sprite、等級、職業名、金幣、寶石；點擊列本體呼叫 `selectCharacter(characterId)` 進入該角色。
- 每列右側獨立的刪除按鈕（`@click.stop` 避免觸發選角），開啟 `GameDeleteCharacterDialog` 確認彈窗。
- 底部「新建角色」按鈕顯示目前名冊佔用（`n/3`），達到 `CHARACTER_ROSTER_MAX` 時停用並改顯示「角色已達上限」。

## 10. 世界觀關聯

角色本身不直接宣告「玩家是機械化身體」的設定——依 `docs/worldview.md` 的敘事規則，這條伏筆只透過職業 blurb（§9）與裝備稀有度越高、貼合感越強但也越詭異的文案（見 `equipment-ideas.md` 底部備註）間接暗示，本文件記錄的是資料模型與流程，敘事文案的完整規則以 `docs/worldview.md` 為準。

## 11. 待確認 / 已知缺口

- 刪除角色（§7）尚未有對應的 OpenSpec Requirement，屬於「code 已落地、文件落後」的既有缺口。
- 刪除角色時孤兒的 `items/{itemId}` 物品文件不做清理，是否需要之後補一支清理 job／batch script 待確認。
- 屬性成長曲線、等級/經驗值表、屬性→戰鬥數值換算公式等養成面向，見 `docs/game-design/mechanics/progression.md`（含該文件記錄的 `unspentAttributePoints` 每級發放數量不一致問題）。
