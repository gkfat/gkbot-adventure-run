## Why

`adventure-run-core` 目前的 run 是單一無限遞增的 `step` 序列：節點一個接一個生成，沒有「關卡」邊界、沒有 boss、也沒有任何呼應 `docs/worldview.md` 已定案的裂域設施敘事（補給/研究/維修/VR，以及可自由擴充的工廠/娛樂場所/百貨商場/小賣店等）。玩家體感是一條無主題的隨機節點流，而非「一次次深入不同裂域設施的遠征」。這次要把節點流重新包裝成「章節（Chapter，一次造訪某個裂域設施實例）→ 關卡（Stage，該設施的複雜度，10~20 節點）→ 節點」的三層結構，每個關卡最後一個節點固定是 Boss 戰。

## What Changes

- 新增 Stage/Chapter 領域概念：run 新增 `chapterIndex`、`chapterStageCount`、`stageIndexInChapter`、`stageNodeIndex`、`stageNodeCount` 欄位；`stageNodeCount` 於每個 Stage 開始時以決定性 RNG 從 10~20 之間 roll 一次，`chapterStageCount`（該設施的複雜度＝章節內的關卡數）於每個章節開始時以決定性 RNG roll 一次（`ASSUMPTION` 值域 3~6，見 design.md）
- 新增章節制關卡命名：章節依序循環 `docs/worldview.md` 定案的設施主題清單（可持續擴充，不限固定 4 種），顯示格式為「{設施名稱}-{章節內關卡序號}」（例如「廢棄研究所-3」），不在名稱中出現全域章節編號
- 新增 `NodeType.BOSS` 與 `EnemyTier 'BOSS'`：每個 Stage 的最後一個節點（`stageNodeIndex === stageNodeCount - 1`）強制為 BOSS combat，優先序高於保底 Rest 與既有 Elite/Strong Elite 節奏；Boss 固定 1 wave 1 敵，數值強度高於 Strong Elite
- 修改節點生成優先序（`decideNextNode`）：Stage 邊界（Boss）判定優先於既有的保底 Rest / Elite 節奏 / 加權隨機
- Boss 戰勝利後：先判斷是否為本章節最後一關（`stageIndexInChapter === chapterStageCount - 1`）——是則章節結束（`chapterIndex + 1`、重新 roll `chapterStageCount`、`stageIndexInChapter` 歸零），否則本章節內推進下一關（`stageIndexInChapter + 1`）；兩種情況都會 `stageNodeIndex` 歸零並重新 roll `stageNodeCount`
- 維持既有 roguelike 精神：章節/Stage 無限循環推進，不設「通關」結局，run 仍只透過死亡（`DEAD`）或斷線逾時（`DISCONNECT`）結束
- 修改冒險畫面（`app/pages/adventure.vue`）：頂部關卡資訊從「第 N 關」（其實是節點序號）改為顯示關卡名稱（例如「廢棄研究所-3」）與 Stage 內節點進度（例如「7 / 14」）；BOSS 節點沿用既有 COMBAT 節點 UI，但顯示 Boss 專屬標籤
- 更新 `docs/worldview.md`：新增設施類型（工廠/娛樂場所/百貨商場/小賣店）與第 3 節「設施風險分級與敵對陣營」的世界觀決策（**本 change 不實作對應機制**，僅世界觀定案，機制留待後續 change）；第 6 節改寫節點數/章節結構敘述

## Capabilities

### Modified Capabilities
- `adventure-run-lifecycle`：節點生成優先序新增 Stage 邊界（Boss）判定；run 文件新增 chapter/stage 相關欄位；首頁「繼續冒險」文案改用章節/Stage 名稱而非原始 step 數
- `combat-engine`：新增 BOSS tier 的難度倍率、固定 1 wave 1 敵、掉落/分數/祝福點數規則

## Impact

- `shared/types/adventure.ts`：`NodeType` 新增 `BOSS`；`AdventureRun` 新增 `chapterIndex`/`chapterStageCount`/`stageIndexInChapter`/`stageNodeIndex`/`stageNodeCount`；新增 `STAGE_CONFIG`（節點數範圍、每章關卡數範圍、設施名稱清單）
- `server/constants/difficulty.ts`：`EnemyTier` 新增 `'BOSS'`，`getStatMultipliers` 新增 BOSS 倍率
- `server/constants/combat.ts`：`TIER_SCORE_MULTIPLIER`/`TIER_BLESSING_POINTS`/`TIER_MAX_DROP_RARITY` 新增 BOSS 條目
- `server/services/adventure-run.service.ts`：`decideNextNode` 加入 Stage 邊界判定；`advanceFromExploring` 處理 BOSS 節點生成；`advanceFromResolution`/`selectBlessing` 處理 Stage/Chapter 邊界推進；`resolveCombat` 對 BOSS tier 強制 1 wave 1 敵（略過 `rollWaveCount`/`rollEnemyCount`）
- `server/repositories/adventure-run.repository.ts`：`createRun` 初始化新欄位（chapterIndex=0, stageIndexInChapter=0, stageNodeIndex=0，並各 roll 一次 chapterStageCount/stageNodeCount）
- `app/pages/adventure.vue` / `app/composables/useAdventureRun.ts`：顯示關卡名稱與節點進度；首頁 CTA 文案（`app/pages/main.vue` 或對應 composable）同步調整
- `docs/worldview.md`：新增設施類型與設施分級/敵對陣營章節；更新節點數/章節結構敘述
- 依賴既有 `deterministic-rng`（`stageNodeCount`/`chapterStageCount` 的 roll）、`combat-engine`（BOSS 戰鬥數值）
