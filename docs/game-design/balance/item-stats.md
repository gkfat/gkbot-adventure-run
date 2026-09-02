# 道具稀有度、掉落率與戰鬥數值加成表

> 本文件是內部設計參考文件，記錄 `server/constants/templates/items.ts` 各 template 的數值曲線（稀有度權重、屬性區間、售價區間）。每個 template 的 `name`/`description`/圖示不隨稀有度變化（設計已定案，見 `content/items.md` 第 3 節）——同一部位的同一把裝備，稀有度只影響下面表格裡的數值與售價，不影響名稱或敘述。名稱/描述的實際文案以 `content/items.md` 第 1 節總覽表為準，本文件不重複列出。

## 裝備重量分類（`weaponWeightClass`）

每個 `type: EQUIPMENT` 的 template（全部 6 個槽位皆適用，不限手部）固定屬於 `LIGHT`/`MEDIUM`/`HEAVY` 三者之一，不隨稀有度改變。分類決定「主屬性」（該槽位既有的成長屬性，如 HAND 武器的 ATK、防具類的 DEF/HP）與「副屬性」（`actionSpeedMod`/`dodgeChanceMod`）的走向：

| 分類 | 主屬性 | 副屬性走向 |
|---|---|---|
| `LIGHT` | 幅度較低 | N/R/SR 僅副屬性（`actionSpeedMod` 加成，負值＝更快）；SSR/L 主屬性＋副屬性雙加成 |
| `MEDIUM` | 隨稀有度純成長 | 無副屬性 |
| `HEAVY` | 三者中幅度最大 | 每個稀有度皆有懲罰：`actionSpeedMod` 為正值（變慢）、`dodgeChanceMod` 為負值（閃避降低），且懲罰幅度隨稀有度單調加重 |

**負重能力折扣**：角色 `STR`+`CON`（`COMBAT_CONFIG.HEAVY_PENALTY_MITIGATION_PER_POINT` = 每點 2%，`MAX_HEAVY_PENALTY_MITIGATION` = 60% 上限）會折扣 `HEAVY` 裝備的 `actionSpeedMod`/`dodgeChanceMod` 懲罰幅度：`折扣後懲罰 = 基礎懲罰 × (1 - min(0.6, (STR + CON) × 0.02))`。折扣有上限，不會把懲罰完全抵銷。

現有 13 個裝備 template 的分類：

| templateId | 槽位 | weaponWeightClass |
|---|---|---|
| `salvaged_wrench` | RIGHT_HAND | MEDIUM |
| `scrap_daggers` | RIGHT_HAND | LIGHT |
| `raider_commander_gauntlet` | RIGHT_HAND | HEAVY |
| `riot_shield_scrap` | LEFT_HAND | HEAVY |
| `hydraulic_arm_guard` | LEFT_HAND | MEDIUM |
| `gkbot_faceplate` | HEAD | MEDIUM |
| `tech_goggles` | HEAD | LIGHT |
| `supply_crate_vest` | BODY | HEAVY |
| `cargo_bot_plate` | BODY | MEDIUM |
| `servo_greaves` | SHOES | LIGHT |
| `magnetic_work_boots` | SHOES | HEAVY |
| `research_chip_ring` | RING | LIGHT |
| `micro_magnet_ring` | RING | MEDIUM |

## 共通掉落機率（各來源共用權重，`STANDARD_RARITY_WEIGHTS`）

| 稀有度 | 權重 | 掉落機率 |
|---|---|---|
| N | 50 | 50% |
| R | 30 | 30% |
| SR | 15 | 15% |
| SSR | 4 | 4% |
| L | 1 | 1% |

## 頭部 Head（MEDIUM／DEF+HP）

`gkbot_faceplate`（weaponWeightClass = MEDIUM）：

| 稀有度 | DEF | HP | 售價 |
|---|---|---|---|
| N | 3–6 | 10–20 | 金幣 100–200 |
| R | 6–12 | 20–40 | 金幣 300–500 |
| SR | 12–20 | 40–70 | 金幣 800–1200 + 寶石 10–20 |
| SSR | 20–30 | 70–110 | 寶石 30–50 |
| L | 30–45 | 110–160 | 寶石 80–120 |

## 頭部 Head（LIGHT／DEF + actionSpeedMod）

`tech_goggles`（weaponWeightClass = LIGHT，actionSpeedMod 負值＝行動更快）：

| 稀有度 | DEF | actionSpeedMod | 售價 |
|---|---|---|---|
| N | — | -0.04 ~ -0.02 | 金幣 100–200 |
| R | — | -0.08 ~ -0.04 | 金幣 300–500 |
| SR | — | -0.14 ~ -0.08 | 金幣 800–1200 + 寶石 10–20 |
| SSR | 5–8 | -0.22 ~ -0.14 | 寶石 30–50 |
| L | 8–13 | -0.32 ~ -0.22 | 寶石 80–120 |

## 身體 Body（HEAVY／DEF+HP + 懲罰）

`supply_crate_vest`（weaponWeightClass = HEAVY）：

| 稀有度 | DEF | HP | actionSpeedMod | dodgeChanceMod | 售價 |
|---|---|---|---|---|---|
| N | 5–9 | 15–25 | 0.04 ~ 0.08 | -0.02 ~ -0.01 | 金幣 100–200 |
| R | 9–16 | 25–50 | 0.08 ~ 0.14 | -0.04 ~ -0.02 | 金幣 300–500 |
| SR | 16–26 | 50–85 | 0.14 ~ 0.22 | -0.07 ~ -0.04 | 金幣 800–1200 + 寶石 10–20 |
| SSR | 26–38 | 85–130 | 0.22 ~ 0.32 | -0.1 ~ -0.07 | 寶石 30–50 |
| L | 38–55 | 130–190 | 0.32 ~ 0.45 | -0.14 ~ -0.1 | 寶石 80–120 |

## 身體 Body（MEDIUM／DEF+HP，無懲罰）

`cargo_bot_plate`（weaponWeightClass = MEDIUM）：

| 稀有度 | DEF | HP | 售價 |
|---|---|---|---|
| N | 3–6 | 12–20 | 金幣 100–200 |
| R | 6–12 | 20–38 | 金幣 300–500 |
| SR | 12–20 | 38–65 | 金幣 800–1200 + 寶石 10–20 |
| SSR | 20–30 | 65–100 | 寶石 30–50 |
| L | 30–42 | 100–145 | 寶石 80–120 |

## 左手 Left Hand（HEAVY／DEF + 懲罰）

`riot_shield_scrap`（weaponWeightClass = HEAVY）：

| 稀有度 | DEF | actionSpeedMod | dodgeChanceMod | 售價 |
|---|---|---|---|---|
| N | 4–8 | 0.05 ~ 0.1 | -0.03 ~ -0.015 | 金幣 100–200 |
| R | 8–16 | 0.1 ~ 0.18 | -0.05 ~ -0.03 | 金幣 300–500 |
| SR | 16–28 | 0.18 ~ 0.28 | -0.08 ~ -0.05 | 金幣 800–1200 + 寶石 10–20 |
| SSR | 28–42 | 0.28 ~ 0.4 | -0.12 ~ -0.08 | 寶石 30–50 |
| L | 42–60 | 0.4 ~ 0.55 | -0.16 ~ -0.12 | 寶石 80–120 |

## 左手 Left Hand（MEDIUM／DEF，無懲罰）

`hydraulic_arm_guard`（weaponWeightClass = MEDIUM）：

| 稀有度 | DEF | 售價 |
|---|---|---|
| N | 3–6 | 金幣 100–200 |
| R | 6–12 | 金幣 300–500 |
| SR | 12–20 | 金幣 800–1200 + 寶石 10–20 |
| SSR | 20–30 | 寶石 30–50 |
| L | 30–42 | 寶石 80–120 |

## 右手 Right Hand（MEDIUM／ATK）

`salvaged_wrench`（weaponWeightClass = MEDIUM）：

| 稀有度 | ATK | 售價 |
|---|---|---|
| N | 5–10 | 金幣 100–200 |
| R | 10–20 | 金幣 300–500 |
| SR | 20–35 | 金幣 800–1200 + 寶石 10–20 |
| SSR | 35–55 | 寶石 30–50 |
| L | 55–80 | 寶石 80–120 |

## 右手 Right Hand（LIGHT／ATK + actionSpeedMod，冒險家 starter 武器）

`scrap_daggers`（weaponWeightClass = LIGHT，actionSpeedMod 負值＝行動更快）：

| 稀有度 | ATK | actionSpeedMod | 售價 |
|---|---|---|---|
| N | 3–6 | -0.05 ~ -0.02 | 金幣 100–200 |
| R | 6–12 | -0.1 ~ -0.05 | 金幣 300–500 |
| SR | 12–20 | -0.18 ~ -0.1 | 金幣 800–1200 + 寶石 10–20 |
| SSR | 20–30 | -0.28 ~ -0.18 | 寶石 30–50 |
| L | 30–42 | -0.4 ~ -0.28 | 寶石 80–120 |

## 右手 Right Hand（HEAVY／ATK + 懲罰）

`raider_commander_gauntlet`（weaponWeightClass = HEAVY）：

| 稀有度 | ATK | actionSpeedMod | dodgeChanceMod | 售價 |
|---|---|---|---|---|
| N | 7–14 | 0.05 ~ 0.1 | -0.03 ~ -0.015 | 金幣 100–200 |
| R | 14–26 | 0.1 ~ 0.18 | -0.05 ~ -0.03 | 金幣 300–500 |
| SR | 26–45 | 0.18 ~ 0.28 | -0.08 ~ -0.05 | 金幣 800–1200 + 寶石 10–20 |
| SSR | 45–70 | 0.28 ~ 0.4 | -0.12 ~ -0.08 | 寶石 30–50 |
| L | 70–100 | 0.4 ~ 0.55 | -0.16 ~ -0.12 | 寶石 80–120 |

## 戒指 Ring（LIGHT／actionSpeedMod + DEF）

`research_chip_ring`（weaponWeightClass = LIGHT，actionSpeedMod 負值＝行動更快）：

| 稀有度 | DEF | actionSpeedMod | 售價 |
|---|---|---|---|
| N | — | -0.04 ~ -0.02 | 金幣 100–200 |
| R | — | -0.08 ~ -0.04 | 金幣 300–500 |
| SR | — | -0.14 ~ -0.08 | 金幣 800–1200 + 寶石 10–20 |
| SSR | 6–10 | -0.22 ~ -0.14 | 寶石 30–50 |
| L | 10–16 | -0.32 ~ -0.22 | 寶石 80–120 |

## 戒指 Ring（MEDIUM／DEF，無懲罰）

`micro_magnet_ring`（weaponWeightClass = MEDIUM）：

| 稀有度 | DEF | 售價 |
|---|---|---|
| N | 2–4 | 金幣 100–200 |
| R | 4–8 | 金幣 300–500 |
| SR | 8–14 | 金幣 800–1200 + 寶石 10–20 |
| SSR | 14–20 | 寶石 30–50 |
| L | 20–28 | 寶石 80–120 |

## 鞋子 Feet（LIGHT／actionSpeedMod + DEF）

`servo_greaves`（weaponWeightClass = LIGHT）：

| 稀有度 | DEF | actionSpeedMod | 售價 |
|---|---|---|---|
| N | — | -0.05 ~ -0.02 | 金幣 100–200 |
| R | — | -0.1 ~ -0.05 | 金幣 300–500 |
| SR | — | -0.18 ~ -0.1 | 金幣 800–1200 + 寶石 10–20 |
| SSR | 14–20 | -0.28 ~ -0.18 | 寶石 30–50 |
| L | 20–28 | -0.4 ~ -0.28 | 寶石 80–120 |

## 鞋子 Feet（HEAVY／DEF + 懲罰）

`magnetic_work_boots`（weaponWeightClass = HEAVY）：

| 稀有度 | DEF | actionSpeedMod | dodgeChanceMod | 售價 |
|---|---|---|---|---|
| N | 4–8 | 0.05 ~ 0.1 | -0.03 ~ -0.015 | 金幣 100–200 |
| R | 8–16 | 0.1 ~ 0.18 | -0.05 ~ -0.03 | 金幣 300–500 |
| SR | 16–28 | 0.18 ~ 0.28 | -0.08 ~ -0.05 | 金幣 800–1200 + 寶石 10–20 |
| SSR | 28–42 | 0.28 ~ 0.4 | -0.12 ~ -0.08 | 寶石 30–50 |
| L | 42–60 | 0.4 ~ 0.55 | -0.16 ~ -0.12 | 寶石 80–120 |

## 藥水 Potion（`engine_oil_basic`，healPercent）

| 稀有度 | healPercent | 售價 |
|---|---|---|
| N | 15–20% | 金幣 20–40 |
| R | 25–30% | 金幣 60–100 |
| SR | 35–40% | 金幣 150–250 + 寶石 5–10 |
| SSR | 40–45% | 寶石 15–25 |
| L | 45–50% | 寶石 30–50 |
