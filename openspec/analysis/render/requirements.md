# Requirements — GkBot Adventure Run

來源：`docs/` 全部文件 + `spec.md`。對應機器可讀版本：`../requirements.yaml`。

## Functional Requirements

### Account & Auth
- **FR-001** Google 登入建立/取得帳號（must）— [CTX-ACTOR-001, CTX-EXT-001]
- **FR-002** 首次登入自動建立帳號與角色（must）— [CTX-ACTOR-001, CTX-CON-006]
- **FR-003** 帳號欄位：createdAt/provider/googleUid/email（must）— [CTX-EXT-002]
- **FR-004** 取得目前使用者資訊（must）— [CTX-ACTOR-001]
- **FR-005** 刪除帳號即刪除全部資料，不可復原（must）— [CTX-CON-004, CTX-CON-006]
- **FR-006** 拒絕未驗證請求（must）— [CTX-ACTOR-002, CTX-EXT-001]

### Character & Progression
- **FR-007** 角色初始化數值（must）
- **FR-008** 等級上限 30（must）
- **FR-009** 升級授予 3 點屬性點（must）
- **FR-010** 分配屬性點 API（must）— [CTX-ACTOR-001]
- **FR-011** Stats 伺服器即時計算，不落 Firestore（must）— [CTX-ACTOR-002, CTX-CON-003]
- **FR-012** 資源上限 clamp [0,100000)（must）— [CTX-CON-003]
- **FR-013** expToNext 表格（must）
- **FR-014** 不提供角色重置（must）— [CTX-CON-006]
- **FR-015** 補血藥水為一般消耗品物品（POTION type，稀有度決定回復%，可購買/掉落）（must）
- ~~FR-016~~ ~~FR-017~~ ~~FR-018~~ **[deprecated]** 藥水等級解鎖／升級／冷卻機制已移除（改為一般消耗品）
- **FR-019** 排行榜自訂暱稱（must）— [CTX-ACTOR-001]

### Items & Equipment
- **FR-020** 物品模板欄位定義（含 EQUIPMENT/POTION 兩種 type）（must）
- **FR-021** 物品實體生成（must）— [CTX-ACTOR-002]
- **FR-022** 雙背包上限：run 50 / 永久 500（must）
- **FR-023** run 結算轉移背包（裝備與未使用的藥水皆轉入永久背包）（must）
- **FR-024** 8 個固定裝備槽位（must）
- **FR-025** 裝備加成僅穿戴時生效（must）
- **FR-026** 裝備替換需確認（must）— [CTX-ACTOR-001]
- **FR-027** 不提供交易（must）— [CTX-CON-007]
- **FR-028** 稀有度影響數值/掉率/價格（must）

### Shop
- **FR-029** 每日 UTC+0 重置商店（must）— [CTX-CON-005]
- **FR-030** 金幣商店 per-account 生成（must）— [CTX-ACTOR-002]
- **FR-031** 紅寶石商店全服共享生成（must）— [CTX-ACTOR-002]
- **FR-032** 每次重置固定格數（should）
- **FR-033** 購買流程（含替換確認）（must）— [CTX-CON-003]
- **FR-034** 商品售出標記（must）
- **FR-035** 購買驗證於伺服器端（must）— [CTX-CON-003]

### Quest & Achievement
- **FR-036** 每日 3 個任務，不允許 reroll（must）— [CTX-CON-005]
- **FR-037** 任務需明確領取獎勵（must）— [CTX-ACTOR-001]
- **FR-038** 成就每帳號限領一次（must）— [CTX-ACTOR-001]
- **FR-039** 冒險 gems 掉落規則（must）
- **FR-040** ⚠️ enemyLevel>30 掉落規則待補（could）— *no upstream source, needs review*

### Leaderboard
- **FR-041** 排行榜分數僅由伺服器寫入（must）— [CTX-CON-003]
- **FR-042** 排行榜顯示暱稱（must）— [FR-019]
- **FR-043** 排行榜常駐不重置（must）
- **FR-044** 排行榜查詢 Top-N + 自己名次（must）— [CTX-ACTOR-001]

### Adventure Run: Lifecycle & State Machine
- **FR-045** 開始新 run（不可有進行中的 run）（must）
- **FR-046** Run 狀態機定義（must）
- **FR-047** Run 結束原因列舉（must）
- **FR-048** 節點生成優先序（保底 Rest > 精英節奏 > 隨機權重）（must）— [CTX-ACTOR-002]
- **FR-049** 敵人等級與基礎倍率公式（must）
- **FR-050** 精英/強力精英倍率（must）— [FR-049]
- **FR-051** 多波/多敵生成機率（must）
- **FR-052** HP 跨 step 延續（must）
- **FR-053** Run 中禁止主動退出（must）— [CTX-ACTOR-001]
- **FR-054** 15 分鐘斷線重連窗口（must）
- **FR-055** RESOLUTION 需手動確認（must）— [CTX-ACTOR-001]
- **FR-056** run 內金幣/紅寶石即時累積，結束才併入角色（must）— [CTX-CON-003]
- **FR-057** 掉落物先進 run 背包，結算轉入永久背包（must）— [FR-022, FR-023]
- **FR-058** 祝福點數累積與觸發（must）
- **FR-059** 祝福候選生成，受 LUCK 影響（must）
- **FR-060** 使用藥水：僅限休息節點，消耗物品實體並依稀有度回復 HP（must）— [FR-015]
- ~~FR-061~~ ~~FR-062~~ **[deprecated]** 攜帶上限 1 瓶／冷卻機制已移除（改由背包容量限制，見 FR-022）

### Combat
- **FR-063** 伺服器單次模擬戰鬥並回傳 combatLog（must）— [CTX-CON-002, CTX-ACTOR-002]
- **FR-064** 傷害/暴擊/閃避公式（must）
- **FR-065** 戰鬥中不可介入（無技能系統）（must）— [CTX-CON-008]
- **FR-066** 戰鬥摘要持久化，log 可選/截斷（must）
- **FR-067** 分數隨擊殺累積（must）
- **FR-068** LUCK 影響掉落（must）
- **FR-069** RunModifier 統一抽象（must）
- **FR-070** 狀態效果跨 step 延續（should）— [FR-069]

### Events / Blessing / Curse
- **FR-071** 事件由伺服器 RNG 決定，含 choices（must）— [CTX-ACTOR-002]
- **FR-072** Blessing/Curse 僅限本次 run（must）— [FR-069]
- **FR-073** 事件轉盤獎勵（must）— [FR-039]
- **FR-074** ⚠️ 轉盤付費加抽待決（could）— *no upstream source, needs review*

### RNG & Replayability
- **FR-075** 決定性 RNG：random(seed, rngIndex)（must）— [CTX-ACTOR-002]
- **FR-076** Client 不可預知 RNG（must）— [CTX-CON-003]
- **FR-077** 摘要式可稽核紀錄（should）
- **FR-078** ⚠️ Anti-cheat 強度與 seed 分享待決（could）— *no upstream source, needs review*

### Firestore Data Model
- **FR-079** 帳號刪除的批次級聯刪除（must）— [CTX-CON-004, FR-005]
- **FR-080** Firestore 預設拒絕直接存取（must）— [CTX-CON-003]

### UI / UX
- **FR-081** 頁面路由規劃（must）— [CTX-ACTOR-001]
- **FR-082** 音效開關持久化（must）— [CTX-ACTOR-001]
- **FR-083** 不提供教學（must）— [CTX-ASM-002]
- **FR-084** 戰鬥回饋與結算畫面（must）— [FR-055, FR-063]
- **FR-085** 路由守衛（must）— [CTX-ACTOR-001, CTX-EXT-001]

### API Documentation
- **FR-086** OpenAPI 自動生成（should）
- **FR-087** Swagger UI（should）— [FR-086]

## Non-Functional Requirements

| ID | Category | Description | Metric |
|---|---|---|---|
| NFR-001 | performance | Checkpoint-driven，不 tick-based | 運行中 run 每秒排程寫入 = 0 |
| NFR-002 | security | 資源異動只能來自 server | 未量化，需審查驗證 |
| NFR-003 | security | 端點需驗證 Bearer idToken | 0 個可略過驗證成功執行 |
| NFR-004 | reliability | gold/gems 邊界 [0,100000) | 所有寫入路徑皆檢查邊界 |
| NFR-005 | cost | 模板資料不查 Firestore | 每 step 模板讀取 = 0 |
| NFR-006 | reliability | 斷線重連窗口 15 分鐘 | 15 分鐘 ± 時鐘誤差 |
| NFR-007 | maintainability | Stats 公式集中單一模組 | 未量化，結構檢查 |
| NFR-008 | security | Firestore 預設拒絕 | rules 預設 deny 已審查 |
| NFR-009 | cost | 戰鬥單次請求完成 | 每場戰鬥 1 次請求 |
| NFR-010 | deployability | Firebase Admin 憑證跨環境免改碼 | local/Vercel 皆可初始化 |
| NFR-011 | security | 排行榜分數僅 server 寫入 | 0 個 client 可寫分數欄位 |
| NFR-012 | maintainability | 新端點需註冊 OpenAPI | 文件化比例 100% |
| NFR-013 | security | Anti-cheat 強度未量化 | 未量化，需與相關人確認 |
| NFR-014 | cost | Run history 保留策略未量化 | 未量化，需與相關人確認 |

## 待確認項目（no upstream source, needs review）
- FR-040：enemyLevel > 30 的 gems 掉落延伸規則
- FR-074：事件轉盤是否可付費加抽
- FR-078：Anti-cheat 目標強度、是否支援分享 seed
- NFR-013：Anti-cheat 量測指標
- NFR-014：Run history 保留策略量測指標

## 下一步
執行 `requirement-modeling`，把以上 FR/NFR 轉為 User Story / Use Case。
