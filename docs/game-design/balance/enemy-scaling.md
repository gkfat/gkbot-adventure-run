# 敵人數值成長曲線

> 本文件是內部設計參考文件，整理 `server/constants/difficulty.ts`（`getEnemyLevel`/`getStatMultipliers`）與 `server/constants/combat.ts`（敵人 archetype 基底數值）的敵人強度成長公式，供策劃快速查閱各 step/tier 對應的實際數值倍率。**所有公式與數值均照抄原始碼，不含任何推算或發明值，除非原始碼註解本身已標明為 ASSUMPTION（見文末說明）。**

## 敵人等級（enemyLevel）如何隨 step 成長

```
enemyLevel = 1 + floor(step / ENEMY_LEVEL_STEP_DIVISOR)
```

- `ENEMY_LEVEL_STEP_DIVISOR = 2`（`shared/types/adventure.ts` `DIFFICULTY_CONFIG`）
- 即每推進 2 個 step，`enemyLevel` +1。

| step | enemyLevel |
|---|---|
| 0 | 1 |
| 5 | 3 |
| 10 | 6 |
| 20 | 11 |
| 30 | 16 |
| 40 | 21 |
| 50 | 26 |

> 來源：`server/constants/difficulty.ts` `getEnemyLevel()`；`server/constants/difficulty.test.ts` 驗證 `getEnemyLevel(0)===1`、`getEnemyLevel(1)===1`、`getEnemyLevel(10)===6`。

## HP / ATK / DEF 的 base multiplier 公式

```
levelSteps = max(0, enemyLevel - 1)
baseHp  = 1 + levelSteps * HP_MULT_PER_LEVEL
baseAtk = 1 + levelSteps * ATK_MULT_PER_LEVEL
baseDef = 1 + levelSteps * DEF_MULT_PER_LEVEL
```

`DIFFICULTY_CONFIG`（`shared/types/adventure.ts`）：

| 係數 | 數值 |
|---|---|
| `HP_MULT_PER_LEVEL` | 0.08 |
| `ATK_MULT_PER_LEVEL` | 0.07 |
| `DEF_MULT_PER_LEVEL` | 0.05 |

即每高 1 級（`enemyLevel`），基礎倍率 HP +8%、ATK +7%、DEF +5%（相對 level 1 累加，非複利）。

## 四個 tier 的倍率

`getStatMultipliers(enemyLevel, tier)` 回傳 `base * tierMult`，tier 倍率**疊加在 base growth curve 之上**，而非疊加在 level 1 的敵人上（`difficulty.ts` 註解原文：「a per-level base growth curve, scaled further by the tier's flat multiplier (ELITE/STRONG_ELITE stack on top of the base curve, not on top of a level-1 enemy)」）。

| Tier | HP 倍率 | ATK 倍率 | DEF 倍率 | 來源 |
|---|---|---|---|---|
| NORMAL | 1.0 | 1.0 | 1.0 | `DIFFICULTY_CONFIG`（隱含，`getStatMultipliers` 內寫死） |
| ELITE | 1.8 | 1.6 | 1.3 | `ELITE_HP_MULT` / `ELITE_ATK_MULT` / `ELITE_DEF_MULT` |
| STRONG_ELITE | 2.6 | 2.1 | 1.6 | `STRONG_ELITE_HP_MULT` / `STRONG_ELITE_ATK_MULT` / `STRONG_ELITE_DEF_MULT` |
| BOSS | 4.0 | 2.8 | 2.0 | `difficulty.ts` `getStatMultipliers()` 內寫死（非 `DIFFICULTY_CONFIG`） |

> **ASSUMPTION（原始碼註解原文引用，`server/constants/difficulty.ts` line 48-49）**：
> ```
> // ASSUMPTION (see design.md): BOSS multipliers extend the Elite/Strong
> // Elite progression, higher than STRONG_ELITE across all three stats.
> ```
> 即 BOSS 的 hp=4.0 / atk=2.8 / def=2.0 是延續 ELITE/STRONG_ELITE 遞增趨勢所發明的數值，並非依任何公式推導，僅保證「三項倍率皆高於 STRONG_ELITE」（`openspec/specs/combat-engine/spec.md` Requirement「Boss 戰鬥數值與獎勵」／Scenario「Boss 數值高於 Strong Elite」也以此為驗收條件）。BOSS tier 固定 1 wave、1 隻敵人，不套用多波/多敵機率。

## 範例查表：不同 step/level × tier 的最終倍率

最終倍率 = base multiplier × tier 倍率。以下取 step = 0, 10, 20, 30（對應 enemyLevel = 1, 6, 11, 16）示範：

### step = 0（enemyLevel = 1，base：hp 1.00 / atk 1.00 / def 1.00）

| Tier | HP | ATK | DEF |
|---|---|---|---|
| NORMAL | 1.00 | 1.00 | 1.00 |
| ELITE | 1.80 | 1.60 | 1.30 |
| STRONG_ELITE | 2.60 | 2.10 | 1.60 |
| BOSS | 4.00 | 2.80 | 2.00 |

### step = 10（enemyLevel = 6，base：hp 1.40 / atk 1.35 / def 1.25）

| Tier | HP | ATK | DEF |
|---|---|---|---|
| NORMAL | 1.40 | 1.35 | 1.25 |
| ELITE | 2.52 | 2.16 | 1.625 |
| STRONG_ELITE | 3.64 | 2.835 | 2.00 |
| BOSS | 5.60 | 3.78 | 2.50 |

### step = 20（enemyLevel = 11，base：hp 1.80 / atk 1.70 / def 1.50）

| Tier | HP | ATK | DEF |
|---|---|---|---|
| NORMAL | 1.80 | 1.70 | 1.50 |
| ELITE | 3.24 | 2.72 | 1.95 |
| STRONG_ELITE | 4.68 | 3.57 | 2.40 |
| BOSS | 7.20 | 4.76 | 3.00 |

### step = 30（enemyLevel = 16，base：hp 2.20 / atk 2.05 / def 1.75）

| Tier | HP | ATK | DEF |
|---|---|---|---|
| NORMAL | 2.20 | 2.05 | 1.75 |
| ELITE | 3.96 | 3.28 | 2.275 |
| STRONG_ELITE | 5.72 | 4.305 | 2.80 |
| BOSS | 8.80 | 5.74 | 3.50 |

> 這些倍率會再乘上敵人 archetype 的基底數值（見下節），才是實際套用在戰鬥的 HP/ATK/DEF。

## 敵人 archetype 基底數值（enemyLevel = 1 時的原始值）

`server/constants/templates/enemies.ts`：成長倍率套用在這些 baseAtk/baseDef/baseHp 上，全部 32 個 archetype 分成四組——GkBot 小兵／GkBot 頭目／盜賊團小兵／盜賊團頭目（`enemy-factions-and-severity` 陣營區分；頭目模板獨立於小兵，不再疊加 BOSS tier 倍率，詳見「四個 tier 的倍率」一節）。

`actionIntervalSec` 為敵人出手間隔（秒），數值越大攻速越慢；實際套用時仍會被 `ENEMY_ACTION_INTERVAL_MIN_MULTIPLIER`（`server/constants/combat.ts`）夾住下限，確保敵人一定比當場玩家慢至少 15%（見 `docs/game-design/mechanics/combat.md`）。

### GkBot 陣營小兵（`ENEMY_ARCHETYPES`）

| Archetype | baseAtk | baseDef | baseHp | actionIntervalSec |
|---|---|---|---|---|
| 維修型 GkBot | 8 | 4 | 90 | 4.5 |
| 保全機具 | 6 | 8 | 120 | 5.0 |
| 失控搬運機 | 12 | 2 | 75 | 4.2 |
| 廢棄零件堆 | 4 | 2 | 45 | 5.5 |
| 產線機械臂 | 11 | 5 | 135 | 4.4 |
| 合成觀測員 | 7 | 3 | 53 | 4.0 |
| 幻影投影體 | 7 | 2 | 48 | 4.1 |
| 荷官型 GkBot | 5 | 5 | 83 | 4.6 |

### GkBot 陣營頭目（`GKBOT_BOSS_ARCHETYPES`）

| Archetype | baseAtk | baseDef | baseHp | actionIntervalSec |
|---|---|---|---|---|
| 看門犬型 GkBot | 10 | 16 | 374 | 4.8 |
| 偵察無人機 | 16 | 6 | 187 | 3.8 |
| 核心維修官 | 14 | 10 | 289 | 4.5 |
| 產線總管 | 22 | 6 | 255 | 4.2 |
| 幻象法師型 | 15 | 5 | 204 | 4.3 |
| 荷官頭目 | 16 | 9 | 272 | 4.4 |
| 倉儲搬運霸主 | 15 | 18 | 391 | 4.9 |
| 商場保全指揮核心 | 14 | 17 | 323 | 4.7 |

### 末世盜賊團陣營小兵（`HUMAN_ARCHETYPES`）

| Archetype | baseAtk | baseDef | baseHp | actionIntervalSec |
|---|---|---|---|---|
| 看門狗 | 7 | 8 | 105 | 4.6 |
| 偵查者（人類斥候） | 8 | 3 | 60 | 4.0 |
| 幫派打手 | 13 | 3 | 83 | 4.1 |
| 烏合掠奪者 | 4 | 2 | 42 | 4.8 |
| 合成士兵 | 12 | 6 | 98 | 4.2 |
| 狙擊掠奪者 | 14 | 2 | 57 | 4.0 |
| 私兵護衛 | 9 | 6 | 90 | 4.4 |
| 賭場保鑣 | 9 | 6 | 87 | 4.5 |

### 末世盜賊團陣營頭目（`HUMAN_BOSS_ARCHETYPES`）

| Archetype | baseAtk | baseDef | baseHp | actionIntervalSec |
|---|---|---|---|---|
| 百夫長 | 20 | 11 | 306 | 4.0 |
| 財庫守門員 | 15 | 17 | 357 | 4.6 |
| 狂暴幫主 | 24 | 6 | 255 | 4.1 |
| 合成軍團長 | 21 | 12 | 340 | 4.3 |
| 影武者 | 22 | 5 | 170 | 3.8 |
| 賭場莊家王 | 16 | 10 | 272 | 4.4 |
| 盜賊團軍師 | 14 | 9 | 255 | 4.5 |
| 末路狂人 | 30 | 4 | 153 | 4.2 |

> 檔案開頭註解原文（`server/constants/templates/enemies.ts` line 3-11）：
> ```
> ASSUMPTION (see combat-engine/design.md): none of this is defined anywhere
> else in the repo — the referenced `10_戰鬥模型.md` doesn't exist, and
> docs/worldview.md explicitly leaves monster naming/stats to this change.
> Base stats are set at enemyLevel=1; actual combat stats are scaled via
> getStatMultipliers() (../difficulty.ts) for the node's real enemyLevel/tier.
> ```
> 即這 32 組 archetype 的基底數值本身也是發明值（無其他 spec 依據），實際戰鬥數值 = base 值 × 上述成長倍率。`actionIntervalSec` 已全數統一 +2 秒調慢敵人攻速（詳見變更歷史，非上述 ASSUMPTION 範圍內的原始發明值）。

## 落地備註

- 公式與四個 tier 倍率（NORMAL/ELITE/STRONG_ELITE/BOSS）皆已在 `server/constants/difficulty.ts` `getStatMultipliers()` 落地，非提案階段內容。
- `server/constants/difficulty.test.ts` 覆蓋：`getEnemyLevel` 的 3 組數值範例、NORMAL level=1 無 tier 加成、level 越高倍率越高、tier 遞增（NORMAL < ELITE < STRONG_ELITE）、BOSS 三項倍率皆高於 STRONG_ELITE，可作為公式正確性的最小驗證集。
- BOSS tier 倍率（hp 4.0 / atk 2.8 / def 2.0）是原始碼明確標註的 ASSUMPTION，尚未有設計文件驗證是否符合實際戰鬥手感，若要調整需同步更新 `difficulty.ts` 與 `difficulty.test.ts` 的邊界斷言。
- `ENEMY_ARCHETYPES`／`GKBOT_BOSS_ARCHETYPES`／`HUMAN_ARCHETYPES`／`HUMAN_BOSS_ARCHETYPES` 的 baseAtk/baseDef/baseHp 同樣是 `enemies.ts` 註解標明的發明值，各 archetype 之間互有 ATK/DEF/HP 側重（爆發型 vs 坦克型 vs 均衡型），調整時建議連動檢查 `expForKill`/`goldForKill`（`server/constants/combat.ts`）等獎勵公式是否仍與敵人強度匹配。
- 本文件不含 EXP/金幣/寶石/掉落機率公式，該部分另見 `docs/game-design/balance/item-stats.md`（掉落率與裝備數值）與 `server/constants/combat.ts` 內的 `expForKill`/`goldForKill`/`gemsDropTier` 等函式（未另立文件）。
