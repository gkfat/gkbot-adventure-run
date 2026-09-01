# 道具稀有度、掉落率與戰鬥數值加成表

> 本文件是內部設計參考文件，把 `equipment-ideas.md` 的裝備文案對應進現有 `server/constants/templates.ts` 的數值曲線（稀有度權重、屬性區間、售價區間）。**目前 code 尚未落地** —— `templates.ts` 每個部位仍只有 1 個 template，用同一份數值曲線橫跨 N→L 五個稀有度，文案也還是單一字串，尚未依稀有度拆分。若要照本文件實裝，需要擴充 `ItemTemplate` 讓 `name`/`description` 可依稀有度變化，或拆成多個 template；詳見文末「落地備註」。

## 裝備重量分類（`weaponWeightClass`）

每個 `type: EQUIPMENT` 的 template（全部 6 個槽位皆適用，不限手部）固定屬於 `LIGHT`/`MEDIUM`/`HEAVY` 三者之一，不隨稀有度改變。分類決定「主屬性」（該槽位既有的成長屬性，如 HAND 武器的 ATK、防具類的 DEF/HP）與「副屬性」（`actionSpeedMod`/`dodgeChanceMod`）的走向：

| 分類 | 主屬性 | 副屬性走向 |
|---|---|---|
| `LIGHT` | 幅度較低 | N/R/SR 僅副屬性（`actionSpeedMod` 加成，負值＝更快）；SSR/L 主屬性＋副屬性雙加成 |
| `MEDIUM` | 隨稀有度純成長 | 無副屬性 |
| `HEAVY` | 三者中幅度最大 | 每個稀有度皆有懲罰：`actionSpeedMod` 為正值（變慢）、`dodgeChanceMod` 為負值（閃避降低），且懲罰幅度隨稀有度單調加重 |

**負重能力折扣**：角色 `STR`+`CON`（`COMBAT_CONFIG.HEAVY_PENALTY_MITIGATION_PER_POINT` = 每點 2%，`MAX_HEAVY_PENALTY_MITIGATION` = 60% 上限）會折扣 `HEAVY` 裝備的 `actionSpeedMod`/`dodgeChanceMod` 懲罰幅度：`折扣後懲罰 = 基礎懲罰 × (1 - min(0.6, (STR + CON) × 0.02))`。折扣有上限，不會把懲罰完全抵銷。

現有 6 個 template 的分類：

| templateId | 槽位 | weaponWeightClass |
|---|---|---|
| `salvaged_wrench` | RIGHT_HAND | MEDIUM |
| `riot_shield_scrap` | LEFT_HAND | HEAVY |
| `gkbot_faceplate` | HEAD | MEDIUM |
| `supply_crate_vest` | BODY | HEAVY |
| `servo_greaves` | SHOES | LIGHT |
| `research_chip_ring` | RING | LIGHT |

## 共通掉落機率（各來源共用權重，`STANDARD_RARITY_WEIGHTS`）

| 稀有度 | 權重 | 掉落機率 |
|---|---|---|
| N | 50 | 50% |
| R | 30 | 30% |
| SR | 15 | 15% |
| SSR | 4 | 4% |
| L | 1 | 1% |

## 頭部 Head（對應現有模板 `gkbot_faceplate`，weaponWeightClass = MEDIUM）

| 稀有度 | 名稱 | DEF | HP | 售價 |
|---|---|---|---|---|
| N | GkBot 的頭部零件 | 3–6 | 10–20 | 金幣 100–200 |
| R | 維修技師護目鏡 | 6–12 | 20–40 | 金幣 300–500 |
| SR | 破損的技術人員校準頭盔 | 12–20 | 40–70 | 金幣 800–1200 + 寶石 10–20 |
| SSR | 退役保全頭盔 *(替代款：掠奪者拼裝面罩)* | 20–30 | 70–110 | 寶石 30–50 |
| L | 黑色訊號罩 | 30–45 | 110–160 | 寶石 80–120 |

## 身體 Body（對應現有模板 `supply_crate_vest`，weaponWeightClass = HEAVY）

| 稀有度 | 名稱 | DEF | HP | actionSpeedMod | dodgeChanceMod | 售價 |
|---|---|---|---|---|---|---|
| N | 工程防護背心 | 5–9 | 15–25 | 0.04 ~ 0.08 | -0.02 ~ -0.01 | 金幣 100–200 |
| R | 防爆維修外套 | 9–16 | 25–50 | 0.08 ~ 0.14 | -0.04 ~ -0.02 | 金幣 300–500 |
| SR | 實驗室隔離衣 | 16–26 | 50–85 | 0.14 ~ 0.22 | -0.07 ~ -0.04 | 金幣 800–1200 + 寶石 10–20 |
| SSR | GkBot 搬運工背甲 *(替代款：私兵繳獲護甲)* | 26–38 | 85–130 | 0.22 ~ 0.32 | -0.1 ~ -0.07 | 寶石 30–50 |
| L | 緊急維生外套 | 38–55 | 130–190 | 0.32 ~ 0.45 | -0.14 ~ -0.1 | 寶石 80–120 |

## 左手 Left Hand（對應現有模板 `riot_shield_scrap`，weaponWeightClass = HEAVY）

| 稀有度 | 名稱 | DEF | actionSpeedMod | dodgeChanceMod | 售價 |
|---|---|---|---|---|---|
| N | 工程護腕 | 4–8 | 0.05 ~ 0.1 | -0.03 ~ -0.015 | 金幣 100–200 |
| R | 磁吸工具腕帶 | 8–16 | 0.1 ~ 0.18 | -0.05 ~ -0.03 | 金幣 300–500 |
| SR | 維修端子手套 | 16–28 | 0.18 ~ 0.28 | -0.08 ~ -0.05 | 金幣 800–1200 + 寶石 10–20 |
| SSR | 液壓作業護臂 *(替代款：掠奪者綁帶護具)* | 28–42 | 0.28 ~ 0.4 | -0.12 ~ -0.08 | 寶石 30–50 |
| L | 舊式校準手環 | 42–60 | 0.4 ~ 0.55 | -0.16 ~ -0.12 | 寶石 80–120 |

## 右手 Right Hand（對應現有模板 `salvaged_wrench`，weaponWeightClass = MEDIUM，ATK）

| 稀有度 | 名稱 | ATK | 售價 |
|---|---|---|---|
| N | 防割工作手套 | 5–10 | 金幣 100–200 |
| R | 精密維修手套 | 10–20 | 金幣 300–500 |
| SR | 電弧絕緣手套 | 20–35 | 金幣 800–1200 + 寶石 10–20 |
| SSR | GkBot 維修夾具 *(替代款：佔領軍指揮官護手)* | 35–55 | 寶石 30–50 |
| L | 應急接線手套 | 55–80 | 寶石 80–120 |

## 戒指 Ring（對應現有模板 `research_chip_ring`，weaponWeightClass = LIGHT，actionSpeedMod 負值＝行動更快）

| 稀有度 | 名稱 | DEF | actionSpeedMod | 售價 |
|---|---|---|---|---|
| N | GK 員工識別環 | — | -0.04 ~ -0.02 | 金幣 100–200 |
| R | 備用記憶環 | — | -0.08 ~ -0.04 | 金幣 300–500 |
| SR | 微型磁力環 | — | -0.14 ~ -0.08 | 金幣 800–1200 + 寶石 10–20 |
| SSR | 實驗型同步環 | 6–10 | -0.22 ~ -0.14 | 寶石 30–50 |
| L | 無標記黑環 *(替代款：陣亡倖存者的婚戒)* | 10–16 | -0.32 ~ -0.22 | 寶石 80–120 |

> 戒指第 6 則文案（婚戒）伏筆最重，因此不放在替代 SSR，而是直接作為 L 的替代款，呼應「戒指承擔身份／記憶伏筆」的既定方向。

## 鞋子 Feet（對應現有模板 `servo_greaves`，weaponWeightClass = LIGHT）

| 稀有度 | 名稱 | DEF | actionSpeedMod | 售價 |
|---|---|---|---|---|
| N | 工程安全靴 | — | -0.05 ~ -0.02 | 金幣 100–200 |
| R | 維修通道靴 | — | -0.1 ~ -0.05 | 金幣 300–500 |
| SR | 靜音工作鞋 | — | -0.18 ~ -0.1 | 金幣 800–1200 + 寶石 10–20 |
| SSR | 磁力作業靴 *(替代款：掠奪者踏勘靴)* | 14–20 | -0.28 ~ -0.18 | 寶石 30–50 |
| L | 回收型動力靴 | 20–28 | -0.4 ~ -0.28 | 寶石 80–120 |

## 藥水 Potion（對應現有模板 `engine_oil_basic`，healPercent）

| 稀有度 | healPercent | 售價 |
|---|---|---|
| N | 15–20% | 金幣 20–40 |
| R | 25–30% | 金幣 60–100 |
| SR | 35–40% | 金幣 150–250 + 寶石 5–10 |
| SSR | 40–45% | 寶石 15–25 |
| L | 45–50% | 寶石 30–50 |

## 對應規則

- `equipment-ideas.md` 每個部位提供 6 則文案，依「越稀有、違和感越重」的既定方向依序對應 N→L 五個稀有度（取前 5 則）。
- 第 6 則（多為「掠奪者」系列）不佔獨立稀有度，而是併入 SSR 或 L 的**替代外觀池**（同數值、不同名稱/敘述），用來強化「敵人是加害者而非受害者」的立場。戒指例外：第 6 則（婚戒）伏筆最重，改列為 L 的替代款。

## 落地備註

- 每個部位目前仍可維持 1 個 template，只需把 `name`/`description` 改成依稀有度動態選字（目前 `ItemTemplate.name`/`description` 是單一字串，需擴充成 per-rarity 文案，或拆成多個 template）。
- 若要讓「替代款」成為真正獨立的掉落項，需要新增對應 `templateId` 並各自設定 `rarityWeights`（例如把該稀有度的權重拆給兩個 template 各一半），這會動到 `ItemTemplate` 資料結構，屬於功能擴充，建議先確認需求再進 `/opsx:propose`。
