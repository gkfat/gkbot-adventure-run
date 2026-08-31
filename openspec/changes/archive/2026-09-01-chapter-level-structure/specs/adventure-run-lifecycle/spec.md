## ADDED Requirements

### Requirement: 章節與關卡的階層
系統 SHALL 在角色文件上維護「章節（Chapter，＝設施主題）→ 關卡（Level）」的階層：角色文件 SHALL 記錄 `currentLevelIndex`（0-based，目前在本章節的第幾關）與 `chapterTotalLevels`（本章節總關卡數）。角色首次進入一個新章節（`nextChapterIndex` 剛遞增，或角色文件初始建立）時，系統 SHALL 依該章節對應的設施類型，從「設施類型 → 關卡數區間」對照表以決定性 RNG roll 出 `chapterTotalLevels`（含頭尾），並將 `currentLevelIndex` 設為 0；`chapterTotalLevels` 在同一章節內 SHALL 維持不變。一次 run SHALL 對應章節內的一個關卡；同一章節內的所有關卡 SHALL 使用同一個設施主題（顯示名稱、怪物風味皆相同）。

#### Scenario: 進入新章節時決定關卡數
- **WHEN** 角色的 `nextChapterIndex` 剛遞增為新的章節索引（見「章節與關卡的推進」）
- **THEN** 系統依新章節的設施類型，從對照表區間以決定性 RNG roll 出 `chapterTotalLevels`，並將 `currentLevelIndex` 重設為 0

#### Scenario: 角色初始建立時的第一個章節
- **WHEN** 角色文件初始建立（`nextChapterIndex = 0`）
- **THEN** 系統比照「進入新章節」邏輯，依第 0 個設施主題的區間 roll 出初始 `chapterTotalLevels`，`currentLevelIndex = 0`

#### Scenario: 設施類型對應關卡數區間
- **WHEN** 系統查詢某設施主題的關卡數區間
- **THEN** 系統回傳該設施類型在「設施類型 → 關卡數區間」對照表中定案的 `{min, max}`（例如「無主小賣店」對應 3~5、「廢棄研究所」對應 8~12；完整 8 種設施類型的區間值定案於實作端 `STAGE_CONFIG` 常數，本 spec 僅保證每種設施類型皆有明確定案的區間，不允許缺漏）

#### Scenario: 同章節內關卡共用設施主題
- **WHEN** 角色在同一章節內從關卡 1 推進到關卡 2
- **THEN** 新關卡對應的新 run 仍使用同一個設施主題（`chapterIndex` 不變），只有 `currentLevelIndex` 遞增

#### Scenario: 設施主題依序循環
- **WHEN** 角色的 `nextChapterIndex` 超過裂域設施主題清單的長度
- **THEN** 依序循環回清單第一個設施主題繼續使用（例如清單有 8 種主題時，第 9 個索引沿用第 1 個設施主題），並依循環後對應到的設施類型 roll 出該章節的 `chapterTotalLevels`

## MODIFIED Requirements

### Requirement: Stage 結構與 Boss 節點
系統 SHALL 將一次 run 的場景流建構為單一個關卡（Level）的 10~20 個 Stage；run 建立時 SHALL 以決定性 RNG 決定該關卡的 Stage 總數（10~20 之間，含頭尾），且該關卡的最後一個 Stage SHALL 固定為 BOSS combat，打贏即代表這個關卡攻略成功。run 建立時 SHALL 使用角色目前的 `nextChapterIndex` 作為本次遠征的裂域設施主題（依序循環裂域設施主題清單，見 `docs/worldview.md` 第 2 節，清單可持續擴充），僅供顯示與敵人風味使用，run 期間不遞增；設施主題（章節）的推進改由「章節與關卡的推進」於角色文件層級處理，且只有攻略完章節最後一關才會真正推進。

#### Scenario: Run 建立時決定 Stage 總數
- **WHEN** 玩家呼叫 `POST /api/adventure/start` 建立新 run
- **THEN** 系統以決定性 RNG roll 出本次關卡的 Stage 總數（10~20 之間），並將 run 的 `chapterIndex` 設為角色目前的 `nextChapterIndex`

#### Scenario: 關卡最後一個 Stage 固定為 Boss
- **WHEN** 目前關卡內 Stage 序號等於「本關卡 Stage 總數 - 1」
- **THEN** 下一個 Stage 固定為 BOSS combat，不受保底 Rest 或加權隨機影響

### Requirement: Stage 完成即結束 Run
系統 SHALL 在玩家於 Boss Stage 的戰鬥中獲勝、並從其 RESOLUTION（或因祝福點數達門檻而經過的 BLESSING_SELECT）繼續前進時，立即以 `endReason = COMPLETED` 結算並結束該 run；即使此時 `blessingPoints` 已達到觸發 BLESSING_SELECT 的門檻，也 SHALL 略過祝福選擇，直接結算。結算時系統 SHALL 依角色目前的 `currentLevelIndex` 與 `chapterTotalLevels` 判定推進方式：若 `currentLevelIndex + 1 < chapterTotalLevels`，SHALL 只將 `currentLevelIndex` 加 1（同章節內推進到下一關，設施主題不變、`nextChapterIndex` 不變）；若 `currentLevelIndex + 1 >= chapterTotalLevels`，SHALL 將 `nextChapterIndex` 加 1、`currentLevelIndex` 重設為 0，並依「章節與關卡的階層」重新 roll 新章節的 `chapterTotalLevels`（章節攻略完畢，切換到下一個設施主題）。`DEAD`/`DISCONNECT` 結算 SHALL NOT 異動 `nextChapterIndex` 或 `currentLevelIndex`。

#### Scenario: 章節內關卡推進（尚未到章節最後一關）
- **WHEN** 玩家在 Boss Stage 的戰鬥中獲勝，並從 RESOLUTION 呼叫 `POST /api/adventure/advance` 繼續前進，且此時 `currentLevelIndex + 1 < chapterTotalLevels`
- **THEN** run 進入 `ENDED`、`endReason = COMPLETED`，角色 `currentLevelIndex` 加 1，`nextChapterIndex` 與 `chapterTotalLevels` 維持不變，回應中附上本次結算摘要

#### Scenario: 章節推進（已攻略完章節最後一關）
- **WHEN** 玩家在 Boss Stage 的戰鬥中獲勝，並從 RESOLUTION 呼叫 `POST /api/adventure/advance` 繼續前進，且此時 `currentLevelIndex + 1 >= chapterTotalLevels`
- **THEN** run 進入 `ENDED`、`endReason = COMPLETED`，角色 `nextChapterIndex` 加 1、`currentLevelIndex` 重設為 0，系統重新 roll 新章節的 `chapterTotalLevels`，回應中附上本次結算摘要

#### Scenario: Boss 戰勝利且祝福點數已達門檻
- **WHEN** 玩家在 Boss Stage 的戰鬥中獲勝，且此時 `blessingPoints` 已達到 `BLESSING_POINTS_THRESHOLD`
- **THEN** 系統略過 BLESSING_SELECT，直接以 `endReason = COMPLETED` 結算該 run（並依上述規則判定關卡推進或章節推進）

#### Scenario: 死亡/斷線不切換關卡或設施主題
- **WHEN** run 以 `endReason = DEAD` 或 `DISCONNECT` 結算
- **THEN** 角色的 `nextChapterIndex`、`currentLevelIndex`、`chapterTotalLevels` 皆維持不變，玩家下次開始新 run 時沿用同一個章節、同一個關卡重新挑戰

### Requirement: 首頁開始/繼續冒險入口
系統 SHALL 讓玩家從首頁根據目前是否有進行中的 run，得到對應的操作入口：沒有進行中 run 時可開始新 run，有進行中 run 時可直接恢復；按鈕上方 SHALL 以小字顯示目前設施主題名稱與章節內關卡進度（`currentLevelIndex + 1` / `chapterTotalLevels`），CTA 按鈕本身文案 SHALL NOT 重複設施名稱。

#### Scenario: 首頁顯示「開始冒險」
- **WHEN** 玩家在首頁，且角色目前沒有進行中（state != ENDED）的 run
- **THEN** 按鈕上方小字顯示「{設施名稱} - {currentLevelIndex + 1}/{chapterTotalLevels}」（例如「廢棄維修廠 - 1/7」），CTA 顯示「開始冒險」，點擊呼叫 `POST /api/adventure/start` 並進入冒險畫面

#### Scenario: 首頁顯示「繼續冒險」
- **WHEN** 玩家在首頁，且角色已有一筆進行中的 run
- **THEN** 按鈕上方小字顯示「{設施名稱} - {currentLevelIndex + 1}/{chapterTotalLevels}」，CTA 顯示「繼續冒險」，點擊呼叫 `GET /api/adventure/current` 直接進入冒險畫面，不呼叫 `start`
