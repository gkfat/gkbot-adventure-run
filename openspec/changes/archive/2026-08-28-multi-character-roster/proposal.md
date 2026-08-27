## Why

目前系統假設「一帳號恆對應一角色」（`CTX-CON-006`），登入時自動建立唯一角色，`characters` collection 以 `accountId` 當文件 ID 寫死 1:1 關係。玩家希望能建立多個不同流派（血量/防禦型、敏捷/攻速型等）的角色並切換遊玩，這是常見的 ARPG/idle game 留存機制，也讓「暱稱/排行榜/裝備/資源」等既有的角色端功能對同一玩家能有多份獨立進度。本 change 把帳號與角色的關係從 1:1 改為 1:N（上限 3），並新增「角色範本（職業）選擇」建立流程。

## What Changes

- **BREAKING**：`characters` collection 的文件 ID 不再等於 `accountId`；改為獨立產生的 `characterId`，並新增 `accountId` 欄位供查詢（1 帳號可對應 0~3 筆角色文件）
- **BREAKING**：`AccountService.createOrGetAccount`（登入流程）不再自動建立角色；帳號建立後角色數量為 0，由玩家在前端角色選擇流程中自行建立
- 新增 4 種角色範本（職業），每種在既有 STR/AGI/CON/LUCK 四維屬性中有 1~2 項明顯突出，並各自搭配一張 `/pixel-art-gen` 產生、與現有 `hero-sprite.png` 同一美術方向的角色圖：
  - 野蠻人（Barbarian）：STR/CON 突出，血量高、防禦高
  - 盜賊（Rogue）：AGI 突出，攻速快、閃避/爆擊高
  - 聖騎士（Paladin）：CON 突出（略高於野蠻人），高防禦、高血量、低攻速，走純坦克路線
  - 流浪者（Wanderer）：LUCK 突出，掉落率/祝福稀有度加成，戰鬥屬性平均
- 新增 `GET /api/character/roster`：列出目前帳號的所有角色（含各自 stats 摘要）與角色範本清單
- 新增 `POST /api/character`：以指定範本建立一個新角色（帳號角色數已達 3 則拒絕）
- 既有 `GET /api/character`、`POST /api/character/attributes`、`POST /api/character/nickname` 改為需帶 `characterId` 操作指定角色（不再隱含「帳號唯一角色」）
- 前端 `/main` 進入遊戲前，插入「角色列表 / 建立角色（像素畫框角色範本選擇）」畫面流程；`useCharacter` composable 改為管理角色清單 + 目前選定角色

## Capabilities

### New Capabilities
- `character-roster`：角色範本清單、角色建立（上限 3）、角色列表查詢與選擇

### Modified Capabilities
- `character-progression`：既有「查詢角色資料」「分配屬性點」「設定暱稱」「建立角色時自動產生預設暱稱」四個 Requirement，其角色建立/存取的前提從「帳號唯一角色、隱含 characterId」改為「需指定 characterId，角色為帳號旗下 0~3 筆之一」

## Impact

- `server/repositories/character.repository.ts`：文件 ID 策略改為自動產生 `characterId`（不再等於 `accountId`），新增依 `accountId` 查詢的方法，`createCharacter` 需接受範本輸入
- `shared/schemas/firestore/character.schema.ts`、`shared/types/character.ts`：新增 `accountId` 索引欄位、角色範本/職業相關欄位（如 `archetypeId`/`className`）
- `server/services/account.service.ts`：`createOrGetAccount` 移除自動建立角色的邏輯
- `server/services/character.service.ts`：`getCharacterWithStats`/`allocateAttributes`/`setNickname` 改為以 `characterId` 為主要查詢鍵，並驗證該角色確實屬於呼叫者的 `accountId`
- 新增 `server/constants/characterArchetypes.ts`（或等效位置）：4 種角色範本的初始屬性、職業名稱、圖片路徑定義
- 新增 `server/api/character/roster.get.ts`、`server/api/character/index.post.ts`；既有 `server/api/character/index.get.ts`、`attributes.post.ts`、`nickname.post.ts` 需改為吃 `characterId`
- 新增 4 張角色範本 pixel art（`/pixel-art-gen`），存於 `public/images/`
- 前端：`app/composables/useCharacter.ts` 改為管理角色清單/目前選定角色；新增角色列表頁與「像素畫框」角色範本選擇 UI；`app/pages/main.vue` 進入遊戲前先過角色選擇流程
- 需要一次性資料遷移：既有已上線帳號的單一角色文件（`characterId === accountId`）需轉換為新結構下該帳號的第一筆角色（保留其 level/exp/gold/gems/attributes/nickname/equipment 等既有資料），並補上 `accountId` 欄位與新產生的 `characterId`；詳細遷移步驟見 design.md
- `openspec/analysis/context.yaml` 的 `CTX-CON-006`（一帳號恆對應一角色）已與此 change 牴觸，需在 sync/後續分析更新中一併修正（本 change 的 4 個 planning artifacts 不含分析層更新，需另外處理）
- 對應分析：無現成 FR/UC id（此需求為使用者直接提出，未涵蓋於既有 `openspec/analysis/requirements.yaml`），建議後續視需要跑 `system-analysis`/`requirement-modeling` 補上追溯
