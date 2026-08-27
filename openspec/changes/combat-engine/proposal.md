## Why

`adventure-run-core` change 提供了狀態機骨架，但 COMBAT 狀態實際「打起來」的計算完全還沒有：傷害、暴擊、閃避、多波多敵、掉落。沒有這一塊，冒險 run 無法真的產生分數與戰利品。

## What Changes

- 新增戰鬥模擬引擎：伺服器單次模擬整場戰鬥（含多 wave/多敵），回傳 `combatLog` 與 `combatSummary`
- 傷害公式：`damage = max(1, ATK-DEF) * (crit ? critMultiplier : 1)`；crit/dodge 機率依 AGI 計算並 clamp 上限
- 套用生效中的 Blessing/Curse（`RunModifier`）於攻防與掉落計算
- 依 LUCK 調整金幣掉落量與物品掉落機率；依 enemyLevel 分級決定 gems 掉落（含 FR-040 的 needs-review 延伸規則）
- 新增 `POST /api/adventure/combat/start`：實作 `adventure-run-core` 定義的 `CombatResolver` 介面

## Capabilities

### New Capabilities
- `combat-engine`：戰鬥模擬（傷害/暴擊/閃避/多波多敵/掉落）與 RunModifier 套用

## Impact

- 實作 `adventure-run-core` change 定義的 `CombatResolver` 介面，取代其 stub
- 新增 `server/services/combat.service.ts`：時間軸自動戰鬥模擬（依 `actionIntervalSec` 排序攻擊順序）
- 依賴 `character-progression` 的 stats 計算（含裝備加成）作為戰鬥雙方數值輸入
- 依賴 `deterministic-rng` capability（`adventure-run-core` change）取得 crit/dodge/掉落的隨機判定
- 依賴 `items-and-equipment` 的 `ItemService.generateItemInstance`（戰鬥掉落裝備）
- 依賴 `quests-and-achievements` 的 `incrementProgress`（例如「擊殺 X 隻怪」任務）
- 對應分析：FR-039、FR-049~052、FR-063~070、FR-084、UC-021、UC-027~028、AGG-009/VO-002/VO-009/VO-010（domain-model.yaml）、API-024（api-model.yaml）、DATA-004/005（data-model.yaml）、RULE-013/015/016、NFR-001/009
