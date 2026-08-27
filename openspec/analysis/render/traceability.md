# Traceability Report — GkBot Adventure Run

機器可讀版本：`../traceability.yaml`。

## 摘要

- **Dangling references：0**（未發現懸空引用，資料本身一致）
- 追溯鏈：36 個 Use Case 中，**24 個為完整鏈**（Context→Requirement→UseCase→Domain→API→Data 全部非空），**12 個為部分鏈**（多數為刻意如此，見下方逐項標註，非缺口）
- 驗證過程中發現並**已修正 3 處**問題（見下方「驗證中已修正」）
- 剩餘 gap：0 個 high、3 個 medium、6 個 low

## 驗證中已修正（非留待使用者處理）

| # | 問題 | 修正 |
|---|---|---|
| FIX-001 | FR-084（戰鬥回饋與結算畫面）是 orphan FR，無任何 UC 引用 | 已加入 UC-023、UC-027 的 `requirements` |
| FIX-002 | data-model.yaml 的 DATA-008/DATA-009 `domainModel` 誤填 AGG-006/AGG-007（違反規範：應填 ENT-...） | 已改為 ENT-007/ENT-008 |
| FIX-003 | requirements.yaml 有 19 筆 FR/NFR 的 `context` 誤填其他 FR id（違反規範：應只填 CTX-...） | 已清空為 `[]`（一筆保留原有的 CTX 部分） |

## 追溯矩陣（Use Case 為主鍵）

| UC | Context | Requirements | Domain Model | API | Data | 備註 |
|---|---|---|---|---|---|---|
| UC-001 | ACTOR-001/002, CON-006, EXT-001/002 | FR-001~003,006 | AGG-001,ENT-001,EVT-001 | API-001 | DATA-001 | 完整 |
| UC-002 | ACTOR-001 | FR-004 | AGG-001,ENT-001 | API-002 | DATA-001 | 完整 |
| UC-003 | CON-003/004/006 | FR-005,079,080 | AGG-001,ENT-001,EVT-002,RULE-018 | API-003 | DATA-001 | 完整 |
| UC-004 | ACTOR-002,CON-003/006 | FR-007,008,011,013,014 | AGG-002,ENT-002,RULE-003,VO-001/002 | API-005 | DATA-002 | 完整 |
| UC-005 | ACTOR-001,CON-003 | FR-009,010,012 | AGG-002,ENT-002,EVT-003,RULE-001/004,VO-001 | API-006 | DATA-002 | 完整 |
| UC-006 | ACTOR-001 | FR-019 | AGG-002,ENT-002 | API-007 | DATA-002 | 完整 |
| UC-007 | CON-003 | FR-015~018 | AGG-002,ENT-002,RULE-001/007,VO-004 | API-008 | DATA-002 | **[deprecated 2026-08-27]** 藥水改一般消耗品 |
| UC-008 | ACTOR-002 | FR-020,021,028 | AGG-004,ENT-003/004,VO-005 | — | — | 內部邏輯，內嵌於其他端點 |
| UC-009 | ACTOR-001 | FR-024~026 | AGG-002,ENT-002/003,EVT-004,RULE-005/019,VO-003 | API-009,010 | DATA-002/003/004 | 完整 |
| UC-010 | CON-007 | FR-022,023,027 | AGG-003,ENT-003/005,RULE-006 | API-011 | DATA-003/004 | 完整 |
| UC-011 | ACTOR-002,CON-005 | FR-029~032 | AGG-005,ENT-006,VO-006 | — | — | 懶生成內嵌於 API-013/014 |
| UC-012 | ACTOR-002 | FR-030,031 | AGG-005,ENT-006,VO-006 | API-013,014 | DATA-004/006/007 | 完整 |
| UC-013 | CON-003 | FR-012,033~035 | AGG-002/005,ENT-002/003/006,EVT-005,RULE-001/009,VO-006 | API-015 | DATA-002/003/004/006/007 | 完整 |
| UC-014 | CON-005 | FR-036 | AGG-006,ENT-007,VO-007 | API-016 | DATA-008 | 完整 |
| UC-015 | ACTOR-001 | FR-037 | AGG-006,ENT-002/007,EVT-006,RULE-001/010,VO-007 | API-016,017 | DATA-008 | 完整 |
| UC-016 | ACTOR-001 | FR-038 | AGG-007,ENT-002/008,EVT-007,RULE-001/011,VO-008 | API-018,019 | DATA-009 | 完整 |
| UC-017 | — | FR-039,040 | ENT-003 | — | — | 內部邏輯；FR-040 needs review |
| UC-018 | ACTOR-001 | FR-042~044 | AGG-008,ENT-009 | API-020 | DATA-010 | 完整 |
| UC-019 | CON-003 | FR-041 | AGG-008,ENT-009,EVT-008,RULE-012 | — | — | 內嵌於 API-028 |
| UC-020 | ACTOR-001/002 | FR-045 | AGG-009,ENT-010,EVT-009,RULE-002 | API-021 | DATA-002/005 | 完整 |
| UC-021 | ACTOR-002 | FR-046~052 | AGG-009,ENT-010,EVT-010,RULE-013 | API-023 | DATA-005 | 完整 |
| UC-022 | ACTOR-001 | FR-053,054 | AGG-009,ENT-010 | API-022 | DATA-005 | 完整 |
| UC-023 | ACTOR-001,CON-003 | FR-055~057,084 | AGG-009,ENT-003/010 | API-023 | DATA-005 | 完整 |
| UC-024 | — | FR-058,059 | AGG-009,ENT-010,EVT-012,RULE-015,VO-009 | API-026 | DATA-005 | 完整（無 CTX，合理） |
| UC-025 | — | FR-060 | AGG-009,ENT-003/010,EVT-014,RULE-020 | API-027 | DATA-004/005 | 完整（2026-08-27 改為消耗 ItemInstance，已補進 adventure-run-core change）|
| UC-026 | CON-003 | FR-047,056,057 | AGG-002/003/009,ENT-002/003/005/010,EVT-015,RULE-001/006 | API-028 | DATA-002/003/004/005/010 | 完整 |
| UC-027 | ACTOR-002,CON-002/008 | FR-063~068,084 | AGG-009,ENT-010,EVT-011,RULE-016,VO-002/010 | API-024 | DATA-004/005 | 完整 |
| UC-028 | — | FR-069,070 | AGG-009,ENT-010,RULE-015,VO-009 | API-024 | DATA-004/005 | 完整 |
| UC-029 | ACTOR-002 | FR-071,072 | AGG-009,ENT-010,EVT-013,VO-009 | API-025 | DATA-005 | 完整 |
| UC-030 | — | FR-073,074 | AGG-009,ENT-003/010,EVT-013 | API-025 | DATA-005 | 完整；FR-074 needs review |
| UC-031 | ACTOR-002,CON-003 | FR-075,076 | AGG-009,ENT-010,RULE-014 | — | — | 內部邏輯 |
| UC-032 | — | FR-077,078 | AGG-009,ENT-010,VO-011 | — | — | 內嵌於 DATA-005；FR-078 needs review |
| UC-033 | CON-003 | FR-080 | RULE-017 | — | — | 基礎設施層 |
| UC-034 | ACTOR-001,ASM-002,EXT-001 | FR-081,083,085 | — | — | — | 前端行為，無新領域概念 |
| UC-035 | ACTOR-001 | FR-082 | AGG-001,VO-012 | API-004 | DATA-001 | 完整 |
| UC-036 | — | FR-086,087 | — | API-029,030 | — | 文件功能，無領域概念 |

## Gap 清單（依 severity 排序）

### Medium
1. **API-012**（`DELETE /inventory/{itemId}`）— 既有程式碼已有 schema，但來源文件與 requirements.yaml 都沒有對應的丟棄物品需求。**建議**：與相關人確認是否為既定需求；若是，回頭跑 system-analysis 補 FR，再跑 requirement-modeling 補 UC。
2. **AGG-006 vs DATA-008 邊界偏差** — 領域模型的「一組 3 個任務」一致性邊界與既有 Firestore「每任務一份文件」實作不完全對齊，已用 batch write 緩解並記錄於 data-model.yaml。**建議**：實作階段留意 batch write 是否足夠；不足再回頭調整 domain-model.yaml。

### Low
3. FR-040 — enemyLevel > 30 的 gems 掉落規則未定義（源自文件本身的 TBD）。
4. FR-074 — 事件轉盤付費加抽尚未定案。
5. FR-078 / NFR-013 — Anti-cheat 目標強度與 seed 分享尚未定案。
6. NFR-014 — Run history 保留策略尚未量化。
7. NFR-008 未直接標註在 api-model/data-model 內文中（功能面已由 UC-033/RULE-017 覆蓋，屬合理現象）。
8. NFR-010、NFR-012 屬部署/工程紀律類 NFR，不自然對應到 schema 欄位（合理，建議另立 checklist 追蹤）。

無 **high** severity gap，無 dangling reference。

## 下一步

分析階段已收斂，沒有阻斷性缺口，可以執行 `/opsx:propose` 依上述 Aggregate 邊界拆分 openspec changes。建議的切分方向（供 propose 階段參考）：
1. **account-and-auth**：AGG-001 Account（含 audio settings）— 對應 UC-001~003, UC-035
2. **character-progression**：AGG-002 Character — 對應 UC-004~007
3. **items-and-equipment**：AGG-003 Inventory + AGG-004 ItemTemplate — 對應 UC-008~010
4. **shop**：AGG-005 Shop — 對應 UC-011~013
5. **quests-and-achievements**：AGG-006 + AGG-007 — 對應 UC-014~017
6. **leaderboard**：AGG-008 — 對應 UC-018~019
7. **adventure-run-core**：AGG-009（狀態機、節點推進、斷線重連、結算）— 對應 UC-020~026
8. **combat-engine**：戰鬥模擬與 RunModifier 套用 — 對應 UC-027~028（可與 #7 合併或獨立，視實作工作量）
9. **events-and-blessings**：事件/轉盤/祝福 — 對應 UC-024, UC-029~030
10. **rng-and-audit**：決定性 RNG + 稽核摘要 — 對應 UC-031~032（可能是橫切基礎設施，供 #7~9 共用）
11. **infra-and-docs**：Firestore security rules 強制、路由守衛、OpenAPI 文件 — 對應 UC-033~034, UC-036
