# blessings-and-curses

## Purpose

冒險 run 內的 Blessing/Curse（RunModifier）：戰鬥累積點數觸發 BLESSING_SELECT 三選一，效果僅在本次 run 有效。

## Requirements

### Requirement: 祝福點數累積與選擇
系統 SHALL 依 combat-engine 已實作的規則累積 `blessingPoints`（每場戰鬥勝利依節點 tier 給予固定點數）。達 adventure-run-core 已定義的門檻後，SHALL 在玩家「進入」下一個 stage node（`stageNodeIndex` 已遞增、離開 RESOLUTION 進入 EXPLORING 之後）才揭露該節點為 BLESSING_SELECT 並提供 3 選 1 候選——與 COMBAT/EVENT/REST/CHOICE 等其他節點類型一致，玩家一律是先進入節點才得知節點內容，BLESSING_SELECT 不例外。候選 SHALL 只從「玩家目前未滿等級（Lv3）」的 Blessing 家族中產生，並依各家族的 `rarity`（COMMON/RARE/EPIC）加權抽選，rarity 越高被抽中的機率隨角色 LUCK 提升；每個候選 SHALL 帶著本次若被選中要授予/升級到的等級（未擁有該家族 → Lv1，已擁有 LvN 且 N < 3 → LvN+1）。選擇後的 Blessing 僅在本次 run 有效。stage 結構性保留的節點（保底 Rest、Boss）SHALL 優先於 BLESSING_SELECT，即使門檻已達成也不得被祝福選擇取代。

#### Scenario: 累積達門檻，於下個節點觸發選擇
- **WHEN** run 的 `blessingPoints` 累積達到門檻，且玩家推進到的下一個 stage node 不是結構性保留的保底 Rest 或 Boss 節點
- **THEN** `stageNodeIndex` 先遞增進入該節點，run 狀態才轉為 BLESSING_SELECT，回傳 3 個候選 Blessing，各自標示 rarity 與本次提供的等級

#### Scenario: 下個節點是保底 Rest 或 Boss，優先於祝福選擇
- **WHEN** run 的 `blessingPoints` 已達到門檻，但玩家推進到的下一個 stage node 是結構性保留的保底 Rest 或 Boss 節點
- **THEN** 該節點仍依原本規則揭露為 REST 或 BOSS，不觸發 BLESSING_SELECT；`blessingPoints` 保留待下次符合條件的節點再觸發

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

### Requirement: Blessing/Curse 僅限本次 run 有效
系統 SHALL 確保所有 Blessing 與 Curse 效果在 run 結束（ENDED）時全部失效，不得影響下一次 run。

#### Scenario: Run 結束後 modifier 清空
- **WHEN** 一個 run 進入 ENDED
- **THEN** 該 run 的所有生效中 RunModifier 不會被帶到玩家下一次開始的新 run
