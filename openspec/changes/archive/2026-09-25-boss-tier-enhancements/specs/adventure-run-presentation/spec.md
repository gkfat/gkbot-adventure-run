## ADDED Requirements

### Requirement: Boss 節點敵我圖像尺寸差異化
系統 SHALL 在 BOSS 節點的戰鬥演出中，將 boss 本體的圖像顯示尺寸放大為一般小兵圖像顯示尺寸的 1.2 倍（或等效地將小兵圖像縮小至 boss 圖像尺寸的 1/1.2），使 boss 與小兵在畫面上可被玩家直觀區分；boss 隨從/minion 的圖像尺寸 SHALL 維持與一般小兵相同，不受此差異化影響。

#### Scenario: Boss 圖像顯示尺寸大於小兵
- **WHEN** 玩家在 BOSS 節點的戰鬥畫面中同時看到 boss 本體與（若有）隨從/小兵的圖像
- **THEN** boss 本體的圖像顯示尺寸為小兵圖像顯示尺寸的 1.2 倍

#### Scenario: 非 boss 節點的敵人圖像尺寸不受影響
- **WHEN** 玩家在一般 COMBAT/ELITE/STRONG_ELITE 節點的戰鬥畫面中看到敵人圖像
- **THEN** 敵人圖像維持既有顯示尺寸，不套用 boss 節點的尺寸差異化規則

#### Scenario: Boss 隨從圖像尺寸與小兵一致
- **WHEN** 玩家在 BOSS 節點的戰鬥畫面中看到 boss 隨從/minion 的圖像
- **THEN** 隨從/minion 圖像顯示尺寸與一般小兵相同，不因位於 boss 節點而放大或縮小
