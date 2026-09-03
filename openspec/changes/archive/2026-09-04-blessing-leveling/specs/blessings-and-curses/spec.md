## MODIFIED Requirements

### Requirement: 祝福點數累積與選擇
系統 SHALL 依 combat-engine 已實作的規則累積 `blessingPoints`（每場戰鬥勝利依節點 tier 給予固定點數），達 adventure-run-core 已定義的門檻時觸發 BLESSING_SELECT 狀態並提供 3 選 1 候選。候選 SHALL 只從「玩家目前未滿等級（Lv3）」的 Blessing 家族中產生，並依各家族的 `rarity`（COMMON/RARE/EPIC）加權抽選，rarity 越高被抽中的機率隨角色 LUCK 提升；每個候選 SHALL 帶著本次若被選中要授予/升級到的等級（未擁有該家族 → Lv1，已擁有 LvN 且 N < 3 → LvN+1）。選擇後的 Blessing 僅在本次 run 有效。

#### Scenario: 累積達門檻觸發選擇
- **WHEN** run 的 `blessingPoints` 累積達到門檻
- **THEN** run 狀態轉為 BLESSING_SELECT，回傳 3 個候選 Blessing，各自標示 rarity 與本次提供的等級

#### Scenario: 選擇未擁有的家族，新增為 Lv1
- **WHEN** 玩家呼叫 `POST /api/adventure/blessing/select` 選擇一個尚未擁有的 Blessing 家族
- **THEN** 該 Blessing 以 `level: 1` 加入 run 的生效中 Blessing 清單，`blessingPoints` 歸零重新累積

#### Scenario: 選擇已擁有的家族，原地升級
- **WHEN** 玩家選擇一個已擁有、且尚未達 Lv3 的 Blessing 家族（目前為 LvN）
- **THEN** 該家族在 run 的生效中 Blessing 清單中被更新為 `level: N+1`（取代舊等級效果，不新增一筆），`blessingPoints` 歸零重新累積

#### Scenario: 已滿 Lv3 的家族不再出現在候選中
- **WHEN** 系統為 run 產生 Blessing 候選
- **THEN** 玩家已擁有且等級為 3 的 Blessing 家族 SHALL 不出現在本次候選清單中

#### Scenario: 選擇不存在的候選
- **WHEN** 玩家送出的 `blessingId` 不在本次候選清單中
- **THEN** 系統回傳 400，不修改 run 狀態
