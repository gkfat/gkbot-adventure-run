## Context

`characters` collection 目前是 1 帳號 1 文件、文件 ID 直接等於 `accountId`（`CharacterRepository.getByAccountId`/`createCharacter` 皆假設此點；`AccountService.createOrGetAccount` 登入時自動建立）。`character-progression` change 已實作並歸檔，且**已有真實玩家資料**（例如帳號 `jHwgxB91BLVDFNqtupu1HGUpkaJ2` 已在正式流程中建立過角色），所以本次調整必須是可回溯相容的資料模型變更，不能要求先跑破壞性遷移才能上線。

`openspec/analysis/context.yaml` 的 `CTX-CON-006`（一帳號恆對應一角色，不提供新增/刪除）與本 change 直接牴觸，視為此分析假設已過時，待後續分析更新時一併修正（不在本 change 的 4 個 planning artifacts 範圍內）。

## Goals / Non-Goals

**Goals:**
- 帳號可擁有 0~3 個角色，各自獨立的 level/exp/gold/gems/attributes/nickname/equipment/unspentAttributePoints
- 提供 4 種角色範本（職業），建立時依範本套用初始屬性分配
- 既有玩家的既有角色資料原地沿用，不需搬移/刪除既有 Firestore 文件
- 所有角色端點皆以 `characterId` 為主鍵操作，並在 server 端驗證該角色屬於呼叫者的 `accountId`（避免 IDOR）

**Non-Goals:**
- 不做角色刪除、角色間資源轉移、建立後改變職業
- 不引入「目前使用中角色」的 server 端狀態（見 Decision）
- 不處理 `adventure-run-core`（冒險 run）如何綁定 characterId，留給該 change 自行對齊本 change 定義的角色端點
- 不在本 change 產生 pixel art 素材本身（規劃素材規格，實際生成在 apply 階段執行）

## Decisions

### 1. `characterId` 改為獨立自動產生，`accountId` 成為查詢欄位
新角色文件 ID 改用 Firestore 自動 ID（`collection.doc()` 不帶參數），並在文件內寫入 `accountId` 欄位；新增 `CharacterRepository.listByAccountId(accountId)`（`where('accountId','==',accountId)`）取代舊有「文件 ID 即 accountId」的單筆查詢。
- **替代方案**：沿用 `characterId===accountId` 並在其後加流水號（如 `${accountId}-0`）→ 放棄，因為會讓既有真實資料的 ID 格式與新資料不一致，查詢邏輯更複雜，且無法受益於 Firestore 自動 ID 的天然唯一性。

### 2. 既有單一角色資料「原地沿用」，不做搬移/刪除
既有角色文件（ID 仍等於 accountId、缺少 `accountId`/`archetypeId`/`className` 欄位）**不需要**被複製到新文件或刪除。改為在讀取路徑自我修復（沿用 `character-progression` change 已建立的 nickname 自我修復慣例）：`CharacterRepository.listByAccountId` 找不到任何 `accountId` 欄位相符的文件時，改查 `characters/{accountId}`（舊格式路徑）；若存在，補寫 `accountId`（=文件 ID 本身）與一個代表「舊角色」的 `archetypeId: 'legacy'`／`className: '冒險者'`，寫回同一份文件（ID 不變）後併入 roster 回傳。
- **替代方案**：寫一支一次性遷移腳本，把舊文件資料複製到新自動 ID 文件、再刪除舊文件 → 放棄，理由：對正式環境的真實使用者資料做「複製+刪除」屬於高風險操作（`CLAUDE.md` 明確要求優先可逆做法），而讀取時自我修復是原地欄位補值（無刪除、無資料搬移），风险更低，且與這個 codebase 已經在用的模式一致（見 `character-progression` 的 nickname 自我修復）。
- 這代表 `archetypeId` 需允許一個特殊值 `'legacy'`（非 4 個正式範本之一），前端角色列表對 `legacy` 角色顯示既有的 `hero-sprite.png` 與「冒險者」職業名稱，不影響其可玩性。

### 3. 不引入 server 端「目前使用中角色」欄位
「目前選定角色」只存在前端（例如 `localStorage`，以 `accountId` 分 namespace），每次呼叫角色相關 API 一律由前端明確帶 `characterId`（route param 或 query）。Server 端每次都驗證 `character.accountId === auth.uid` 才允許操作。
- **替代方案**：在 `accounts` 文件加 `activeCharacterId` 欄位，server 端記住「目前角色」→ 放棄，理由：目前沒有任何情境需要 server 記住跨裝置的選擇（未登入其他裝置時本來就要重新選），加這個欄位只會多一個要維護一致性的地方，且未來 `adventure-run-core` 的 run 文件本身就會綁定 characterId，不需要靠 account 層的全域指標。

### 4. 角色數量上限（3）以 `listByAccountId` 的結果數在建立時檢查
`POST /api/character` 建立前先查詢 roster 現有數量，`>= 3` 則回 400。不使用 Firestore transaction 鎖（單一玩家不會有高併發建立角色的情境，且最壞情況只是極端 race 下多建 1 筆，可接受）。

### 5. 角色範本（職業）定義
新增 `server/constants/characterArchetypes.ts`，定義 4 個範本，屬性總點數固定為 8（原本單角色初始為 STR/AGI/CON/LUCK 各 1、總 4 點；範本改為總 8 點以做出明顯差異化，`unspentAttributePoints` 建立時仍為 0，與既有角色一致）：

| archetypeId | 職業名稱 | STR | AGI | CON | LUCK | 特色 |
|---|---|---|---|---|---|---|
| `barbarian` | 野蠻人 | 3 | 1 | 3 | 1 | 血量高、攻防均衡的近戰肉盾 |
| `rogue` | 盜賊 | 1 | 5 | 1 | 1 | 攻速快、閃避/爆擊高 |
| `paladin` | 聖騎士 | 2 | 1 | 4 | 1 | CON 最高，防禦/血量最強、攻速偏慢 |
| `wanderer` | 流浪者 | 1 | 2 | 1 | 4 | LUCK 最高，掉落率/祝福稀有度加成，戰鬥屬性平均 |

每個範本各自對應一張 `/pixel-art-gen` 產生的角色圖（沿用 `hero-sprite.png` 的美術方向：sage green `#81b29a`／pale lavender `#C4CBDB`／dusty brick-rose `#a05d5d`、深色描邊，32x32 網格），存於 `public/images/archetypes/<archetypeId>.png`。`legacy` 角色沿用既有 `public/images/hero-sprite.png`，不需要新圖。

### 6. API 形狀
- `GET /api/character/roster` → `{ characters: CharacterSummary[], archetypes: Archetype[] }`（`archetypes` 內含 4 個範本定義，供前端渲染像素畫框選擇畫面；`CharacterSummary` 含 characterId/nickname/level/archetypeId/className/spriteUrl，不含完整 stats，減少 payload）
- `POST /api/character` `{ archetypeId }` → 建立新角色，回傳完整 `CharacterWithStats`；roster 已滿 3 則 400
- `GET /api/character/:characterId`、`POST /api/character/:characterId/attributes`、`POST /api/character/:characterId/nickname`：既有 3 個端點改吃路徑參數 `characterId`（原本是隱含帳號唯一角色），皆需驗證 ownership

## Risks / Trade-offs

- [風險] `legacy` 讀取時自我修復邏輯只在該帳號「呼叫 roster API」時觸發；若某帳號一直不呼叫，其舊角色文件會長期缺少 `accountId` 欄位 → [緩解] 不影響功能正確性（roster 查詢已同時檢查舊格式路徑），純粹是資料一致性的漸進收斂，可接受
- [風險] 既有前端（`useCharacter`、`main.vue`、`GameResourceBar`、`characterStage.vue`）目前假設「登入即有唯一角色」，本 change 需要同步大改前端角色狀態管理與新增角色選擇流程，改動範圍較大 → [緩解] tasks.md 會拆成 roster 狀態管理、角色列表 UI、像素畫框建立 UI 三個獨立步驟，逐步驗證
- [風險] 4 個角色範本的屬性數值（如攻速/爆擊/防禦的實際落差）目前只是設計階段的靜態分配，尚未實際跑過數值平衡測試 → [緩解] 沿用既有 `calculateBaseStats` 公式即時計算，數值可在之後單獨微調範本表，不影響 API 形狀

## Migration Plan

- **不執行批次遷移腳本**，改用讀取時自我修復（見 Decision 2）
- 部署順序：
  1. 部署新的 `characterSchema`（新增 `accountId`/`archetypeId`/`className` 欄位，皆為必填但 `legacy` 角色可用固定值滿足）與新 repository/service/API
  2. 舊有帳號第一次呼叫 `GET /api/character/roster` 時，其舊角色會被判定為 `legacy` 並補寫欄位，之後行為與新建角色一致（可設定暱稱、分配屬性點、被 leaderboard 讀取暱稱皆不受影響）
- **Rollback**：本 change 對既有欄位皆為「新增」而非「修改既有語意」，若需回滾，既有 `nickname`/`level`/`attributes` 等欄位不受影響；回滾後新建立的多角色文件（有 `accountId` 欄位、非 `legacy`）會變成無法被舊版 API 存取的孤兒資料，需人工評估是否清除（非本 change 自動處理範圍）
