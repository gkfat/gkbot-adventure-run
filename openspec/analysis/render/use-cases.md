# Use Cases — GkBot Adventure Run

機器可讀版本：`../use-cases.yaml`。共 36 個 User Story、36 個 Use Case，涵蓋 requirements.yaml 全部 87 條 FR。

## Story 總覽

| Story | Actor | 摘要 |
|---|---|---|
| STORY-001 | Player | Google 登入 |
| STORY-002 | Player | 查看帳號資訊 |
| STORY-003 | Player | 刪除帳號 |
| STORY-004 | Player | 檢視角色與 stats |
| STORY-005 | Player | 分配屬性點 |
| STORY-006 | Player | 設定暱稱 |
| STORY-007 | Player | ~~升級補血藥水~~【deprecated，藥水改為一般消耗品】 |
| STORY-008 | Server | 生成物品實體 |
| STORY-009 | Player | 裝備/卸下物品 |
| STORY-010 | Player | 檢視背包 |
| STORY-011 | Server | 每日商店重置 |
| STORY-012 | Player | 瀏覽商店 |
| STORY-013 | Player | 購買商品 |
| STORY-014 | Server | 每日任務重置 |
| STORY-015 | Player | 領取任務獎勵 |
| STORY-016 | Player | 領取成就獎勵 |
| STORY-017 | Server | 冒險 gems 掉落 |
| STORY-018 | Player | 檢視排行榜 |
| STORY-019 | Server | 結算寫入排行榜 |
| STORY-020 | Player | 開始冒險 run |
| STORY-021 | Server | 推進節點 |
| STORY-022 | Player | 斷線重連 |
| STORY-023 | Player | 確認 RESOLUTION |
| STORY-024 | Player | 選擇祝福 |
| STORY-025 | Player | 使用補血藥水 |
| STORY-026 | Server | 結束並結算 run |
| STORY-027 | Server | 解決戰鬥 |
| STORY-028 | Server | 套用 RunModifier |
| STORY-029 | Server | 解決隨機事件 |
| STORY-030 | Player | 轉動事件轉盤 |
| STORY-031 | Server | 消耗決定性 RNG |
| STORY-032 | Server | 保存稽核摘要 |
| STORY-033 | Server | 強制 Firestore 僅限伺服器存取 |
| STORY-034 | Player | 路由守衛 |
| STORY-035 | Player | 切換音效設定 |
| STORY-036 | Maintainer | 產生/檢視 OpenAPI 文件 |

## 依領域分組的 Use Case

### 帳號與身份驗證
- **UC-001** Google 登入 / 首次登入建立帳號與角色 — [FR-001, FR-002, FR-003, FR-006]
- **UC-002** 查詢目前帳號資訊 — [FR-004]
- **UC-003** 刪除帳號（含全部關聯資料） — [FR-005, FR-079, FR-080]（受 NFR-002 約束）

### 角色與成長
- **UC-004** 檢視角色資料與計算後 Stats — [FR-007, FR-008, FR-011, FR-013, FR-014]（受 NFR-007 約束）
- **UC-005** 分配屬性點 — [FR-009, FR-010, FR-012]
- **UC-006** 設定排行榜暱稱 — [FR-019]
- ~~UC-007 升級補血藥水~~ **[deprecated]** — 藥水改為一般消耗品物品（購買/掉落取得，見 FR-015），不再有角色端升級動作

### 物品與裝備
- **UC-008** 生成物品實體（掉落/商店上架） — [FR-020, FR-021, FR-028]（受 NFR-005 約束）
- **UC-009** 裝備 / 卸下物品 — [FR-024, FR-025, FR-026]
- **UC-010** 檢視背包（run / 永久） — [FR-022, FR-023, FR-027]

### 商店
- **UC-011** 每日商店重置 — [FR-029, FR-030, FR-031, FR-032]
- **UC-012** 瀏覽今日商店 — [FR-030, FR-031]
- **UC-013** 購買商店物品 — [FR-033, FR-034, FR-035, FR-012]（受 NFR-002, NFR-004 約束）

### 任務與成就
- **UC-014** 每日任務重置 — [FR-036]
- **UC-015** 追蹤並領取每日任務獎勵 — [FR-037]（受 NFR-002 約束）
- **UC-016** 領取成就獎勵 — [FR-038]（受 NFR-002 約束）
- **UC-017** 冒險過程獲得 gems 掉落 — [FR-039, FR-040]

### 排行榜
- **UC-018** 檢視排行榜 — [FR-042, FR-043, FR-044]
- **UC-019** Run 結算時寫入排行榜 — [FR-041]（受 NFR-011 約束）

### 冒險 Run 生命週期
- **UC-020** 開始新的冒險 run — [FR-045]
- **UC-021** 推進到下一個節點 — [FR-046~FR-052]（受 NFR-001 約束）
- **UC-022** 斷線後於重連窗口內恢復 run — [FR-053, FR-054]（受 NFR-006 約束）
- **UC-023** 確認 RESOLUTION 並推進 — [FR-055, FR-056, FR-057]
- **UC-024** 選擇祝福 — [FR-058, FR-059]
- **UC-025** 於休息節點使用藥水（消耗 POTION 物品實體） — [FR-060]
- **UC-026** 結束並結算冒險 run — [FR-047, FR-056, FR-057]（受 NFR-002, NFR-004 約束）

### 戰鬥
- **UC-027** 解決一場戰鬥 — [FR-063~FR-068]（受 NFR-009, NFR-001 約束）
- **UC-028** 於戰鬥中套用 RunModifier — [FR-069, FR-070]

### 事件 / 祝福 / 詛咒
- **UC-029** 解決隨機事件 — [FR-071, FR-072]
- **UC-030** 轉動事件轉盤 — [FR-073, FR-074]

### RNG / 可重播
- **UC-031** 消耗決定性 RNG — [FR-075, FR-076]（受 NFR-002 約束）
- **UC-032** 保存 run 稽核摘要 — [FR-077, FR-078]（受 NFR-013, NFR-014 約束）

### 資料存取安全
- **UC-033** 強制 Firestore 僅限伺服器存取 — [FR-080]（受 NFR-008 約束）

### UI / UX
- **UC-034** 路由守衛導向登入 — [FR-081, FR-085, FR-083]（受 NFR-003 約束）
- **UC-035** 切換 BGM / 音效設定 — [FR-082]

### API 文件
- **UC-036** 產生並檢視 OpenAPI 文件 — [FR-086, FR-087]（受 NFR-012 約束）

> 每個 Use Case 的完整 preconditions / mainFlow / alternateFlows / postconditions 請見 `../use-cases.yaml`。

## Traceability 檢查
- requirements.yaml 的 87 條 FR 全數至少對應到一個 Use Case。
- FR-040、FR-074、FR-078 對應的 Use Case（UC-017、UC-030、UC-032）在 alternateFlows 中明確標註「規則未定案」，對應原始 `needs review` 標記。

## 下一步
執行 `domain-modeling`，從以上 Use Case 萃取 Entity / Value Object / Aggregate / Domain Event / Business Rule。
