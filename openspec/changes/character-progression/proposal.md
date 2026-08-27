## Why

角色的初始化與 Firestore repository 雛形已存在（`server/repositories/character.repository.ts`、`server/constants/stats.ts` 已有 `calculateBaseStats`），但完全沒有對外的 API 端點：玩家無法查詢角色、分配屬性點、設定暱稱。這是目前遊戲最基礎的缺口——沒有這一塊，商店購買、冒險結算等所有後續 change 都無法把資源/裝備變動反映給玩家看到。

> 更新（2026-08-27）：補血藥水已改為一般消耗品物品（type=POTION，可購買/掉落取得），不再是角色端的固定欄位或升級路徑，因此本 change 移除原本規劃的 `healing-potion` capability 與 `POST /api/character/potion/upgrade` 端點；詳見 `items-and-equipment` change（POTION 物品生成）與 `adventure-run-core` change（`POST /api/adventure/rest/heal` 使用藥水）。

## What Changes

- 新增 `GET /api/character`：回傳角色資料（等級/資源/attributes/裝備引用）與 server 即時計算的 stats（不落庫）
- 新增 `POST /api/character/attributes`：分配 `unspentAttributePoints`
- 新增 `POST /api/character/nickname`：設定排行榜顯示暱稱（覆蓋角色建立時系統自動產生的預設暱稱）
- 角色建立流程（`prepareInitialCharacterData`）新增自動產生預設暱稱邏輯（格式：`玩家{accountId 後 6 碼大寫}`），確保 `nickname` 一律有值，`leaderboard` change 無需等待玩家手動設定即可顯示
- 補齊 `server/services/` 的 `CharacterService`（目前只有 `AccountService` 內嵌了建立角色的邏輯，缺乏獨立的角色服務層）
- 擴充 `server/constants/stats.ts` 的計算，納入裝備加成（目前 `calculateBaseStats` 只算 attributes，未含裝備與 run modifiers；run modifiers 部分留給 `adventure-run-core`/`combat-engine` change 串接，本 change 只需預留擴充點）

## Capabilities

### New Capabilities
- `character-progression`：角色查詢、屬性點分配、暱稱設定

### Modified Capabilities
（無；目前 `openspec/specs/` 尚無既有 capability）

## Impact

- `shared/schemas/api/character.schema.ts`：既有 schema 已定義好回應/請求形狀，直接沿用，不需大改（`healingPotion` 相關欄位需一併從 `characterSchema`/`getCharacterResponseSchema` 移除，見 tasks）
- `shared/schemas/firestore/character.schema.ts`：`nickname` 欄位語意由「選填」改為「必填字串（建立時保證有預設值）」
- `server/repositories/character.repository.ts`：`prepareInitialCharacterData` 新增預設暱稱產生邏輯
- `server/services/character.service.ts`（新增）：屬性分配、暱稱設定的商業邏輯與規則檢查
- `server/constants/stats.ts`：`calculateBaseStats` 擴充為支援裝備加成的參數（介面預留，裝備讀取邏輯待 `items-and-equipment` change 完成後串接）
- 新增 `server/api/character/index.get.ts`、`server/api/character/attributes.post.ts`、`server/api/character/nickname.post.ts`
- `server/utils/openapi.ts`：註冊新路徑
- 對應分析：FR-007~014、FR-019、UC-004~006、AGG-002/ENT-002/VO-001/VO-002（domain-model.yaml）、API-005~007（api-model.yaml）、DATA-002（data-model.yaml）、RULE-001/003/004
