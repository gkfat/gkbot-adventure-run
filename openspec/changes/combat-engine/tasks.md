## 1. 戰鬥數值常數

- [ ] 1.1 於 `server/constants/stats.ts`（或新增 `server/constants/combat.ts`）補齊 crit/dodge 係數與上限（`baseCrit=0.05`、`critPerAgi=0.003`、`critCap=0.35`、`critMultiplier=1.5`、`baseDodge=0.03`、`dodgePerAgi=0.002`、`dodgeCap=0.25`）

## 2. 戰鬥模擬引擎

- [ ] 2.1 新增 `server/services/combat.service.ts`：時間軸事件排程（依 actionIntervalSec 決定行動順序）
- [ ] 2.2 傷害計算：`damage = max(1, ATK-DEF) * (crit ? critMultiplier : 1)`，crit/dodge 判定透過 `RngService`
- [ ] 2.3 `applyModifiers(baseStats, activeModifiers)`：套用生效中 Blessing/Curse 的臨時數值修正
- [ ] 2.4 掉落結算：金幣（受 LUCK 影響）、物品（呼叫 `items-and-equipment` 的 `ItemService.generateItemInstance`）、gems（依 enemyLevel 分級，含 >30 的 fallback 規則並加註記）

## 3. 對接 adventure-run-core

- [ ] 3.1 實作 `CombatResolver` 介面（取代 `adventure-run-core` 的 stub）
- [ ] 3.2 戰鬥結束後呼叫 `quests-and-achievements` 的 `incrementProgress`（例如擊殺數）

## 4. API

- [ ] 4.1 新增 `server/api/adventure/combat/start.post.ts`

## 5. 文件與驗證

- [ ] 5.1 於 `server/utils/openapi.ts` 註冊新路徑
- [ ] 5.2 單元測試：傷害公式邊界（ATK<=DEF 時傷害恆為 1）、crit/dodge 機率的 clamp 上限、多波多敵的 combatLog 完整性
- [ ] 5.3 執行 `pnpm nuxt typecheck`
- [ ] 5.4 手動驗證：不同 LUCK 值的掉落量差異、Blessing/Curse 生效時的傷害變化
