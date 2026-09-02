# 道具內容目錄（templates／圖示／文案）

> 本文件是內部設計參考文件，與 `docs/game-design/balance/item-stats.md` 分工互補：
> - `item-stats.md` 負責**數值面**——稀有度掉落權重、屬性區間、售價區間。
> - 本文件負責**內容清單面**——目前實際存在哪些道具模板（`ITEM_TEMPLATES`）、對應哪個像素圖示、名稱/描述文案，以及與 `equipment-ideas.md` 候補文案池的關係。
>
> 數值/掉落率/售價一律不重複列在這裡，需要時請連結到 `item-stats.md` 對應章節。權威資料來源：`server/constants/templates/items.ts`（`ITEM_TEMPLATES`）、`app/utils/pixelIcons.ts`、`public/images/pixel-icons/`（圖示 PNG，來源見 `scripts/pixel-art/game-icons/build.py`）、`app/utils/equipmentDisplay.ts`、`shared/types/item.ts`。

## 0. 型別背景

依 `shared/types/item.ts`：

- `ItemType`：`EQUIPMENT` / `POTION`
- `EquipmentSlot`（`shared/types/common.ts`）：`HEAD` / `BODY` / `SHOES` / `LEFT_HAND` / `RIGHT_HAND` / `RING`
- 每個 `ItemTemplate` 的 `name`/`description`/圖示是**單一**、橫跨 N~L 五個稀有度共用的（設計已定案，見第 3 節）；隨稀有度變化的只有數值（`rarityWeights`、`baseStatsRange`/`healPercentRange`、`priceRangeByRarity`）。也就是說「同一把扳手，數值隨稀有度變強」，而不是每個稀有度各自是外觀/敘述不同的獨立道具。

## 1. 道具模板總覽表

目前 `ITEM_TEMPLATES` 共 14 筆，來源：`server/constants/templates/items.ts`。

| templateId | 名稱 | 類型 | 裝備欄位 | weaponWeightClass | 一句話描述 |
|---|---|---|---|---|---|
| `salvaged_wrench` | 維修工作手套 | EQUIPMENT | RIGHT_HAND | MEDIUM | 從裂域維修站翻出的耐磨工作手套，能抵禦碎金屬與鋒利零件，戴上後意外靈活 |
| `scrap_daggers` | 拆信刀 | EQUIPMENT | RIGHT_HAND | LIGHT | 辦公室裡隨處可見的拆信刀，刀刃單薄卻異常鋒利（冒險家 starter 武器，見 `character-starter-loadout`） |
| `raider_commander_gauntlet` | 佔領軍指揮官護手 | EQUIPMENT | RIGHT_HAND | HEAVY | 擊敗某支武裝勢力的頭目後拿到的護手，握把處還留著別人的掌紋 |
| `riot_shield_scrap` | 工程維修護腕 | EQUIPMENT | LEFT_HAND | HEAVY | 把小型工具固定在腕上、減少搬運重物衝擊的實用裝備 |
| `hydraulic_arm_guard` | 液壓作業護臂 | EQUIPMENT | LEFT_HAND | MEDIUM | 拆自工廠重型機械的輔助護臂，啟動時會發出低沉的嗡鳴聲 |
| `gkbot_faceplate` | GkBot 頭部零件 | EQUIPMENT | HEAD | MEDIUM | 從施工型機器人頭部拆解下來的零部件，卡榫奇異地貼合頭型 |
| `tech_goggles` | 維修技師護目鏡 | EQUIPMENT | HEAD | LIGHT | 用來檢查精密零件的護目鏡，總能第一時間看出哪一台機器「快壞了」 |
| `supply_crate_vest` | 工程防護背心 | EQUIPMENT | BODY | HEAVY | 裂域維修人員的標準裝備，口袋多得離譜 |
| `cargo_bot_plate` | GkBot 搬運工背甲 | EQUIPMENT | BODY | MEDIUM | 從大型搬運機器上拆下來的防撞裝甲，你似乎很快就習慣了它的重量 |
| `servo_greaves` | 工程安全靴 | EQUIPMENT | SHOES | LIGHT | 鋼頭防穿刺防滑的標準 GK 工程人員安全靴 |
| `magnetic_work_boots` | 磁力作業靴 | EQUIPMENT | SHOES | HEAVY | 工廠高空維修用的磁吸靴，能牢牢吸住金屬地面 |
| `research_chip_ring` | GK 員工識別環 | EQUIPMENT | RING | LIGHT | 不知道是哪個年代的員工識別裝置，晶片早已失效 |
| `micro_magnet_ring` | 微型磁力環 | EQUIPMENT | RING | MEDIUM | 簡單的工業用磁力裝置，靠近散落零件時會微微發熱 |
| `engine_oil_basic` | 機油 | POTION | — | — | 「為什麼喝機油會補血...？但真好喝，咕嚕咕嚕咕嚕。」 |

`weaponWeightClass`（LIGHT/MEDIUM/HEAVY）是速度/主屬性/閃避的取捨分類，掛在 template 層、不隨稀有度變化；機制與各分類走向規則見 `item-stats.md`「裝備重量分類」章節。每個裝備欄位現在都有 LIGHT/MEDIUM/HEAVY 三個 weaponWeightClass 各一個 template（RIGHT_HAND 三個都齊了；其餘欄位各 2 個，缺的第三個尚未補齊——見第 4 節）。

各 template 的完整數值曲線（分稀有度的 ATK/DEF/HP/actionSpeedMod/dodgeChanceMod/healPercent 區間、售價區間）見 `item-stats.md` 對應章節：頭部 / 身體 / 左手 / 右手 / 戒指 / 鞋子 / 藥水。

裝備 6 個欄位（HEAD/BODY/SHOES/LEFT_HAND/RIGHT_HAND/RING）中 RIGHT_HAND 有 3 個 template（`salvaged_wrench`/`scrap_daggers`/`raider_commander_gauntlet`），其餘各欄 2 個，加上藥水 1 個，共 14 筆。新增的 6 個 template（`tech_goggles`/`cargo_bot_plate`/`hydraulic_arm_guard`/`raider_commander_gauntlet`/`micro_magnet_ring`/`magnetic_work_boots`）文案取自 `equipment-ideas.md` 候補池（每部位挑 1 則），數值曲線是新設計的（同 weaponWeightClass 兄弟 template 的曲線形狀，未直接照抄任何既有 template）。

## 2. 圖示對照表

來源：`app/utils/pixelIcons.ts`（`PixelIconName` 型別，僅列合法名稱）、`public/images/pixel-icons/<name>.png`（實際圖檔，16×16 px，逐 icon 一個檔案）、`app/utils/equipmentDisplay.ts`（`TEMPLATE_ICON`、`SLOT_FALLBACK_ITEM_ICON`、`SLOT_PIXEL_ICON`）。

`<GamePixelIcon>`（`app/components/game/pixelIcon.vue`）直接渲染 `<img src="/images/pixel-icons/${name}.png">`（`image-rendering: pixelated`），不再是執行期逐 pixel 畫 SVG。PNG 的可編輯來源是 `scripts/pixel-art/game-icons/build.py`（`pixel-art-studio` 產出的 build script）——改圖示要改這支 script 再重新 `python3 scripts/pixel-art/game-icons/build.py` 匯出，不要直接改 PNG 二進位檔。

全部 23 顆圖示已從 12×12 升級為 16×16、full-outline 風格，對齊 `art/items/*.json` 這批參考美術稿的畫風（深色外框 `#2b2d30`＋陰影 `#5a5e64`＋底色 `#8a8f96`＋各圖示的強調色）。其中 7 顆（`wrench`/`riotShield`/`faceplate`/`crateVest`/`greaves`/`chipRing`/`engineOil`，對應 7 個最初的裝備 template）直接從 `art/items/<templateId>.json` 讀取像素資料匯出，不是重新手繪，確保與參考稿逐 pixel 一致；其餘 16 顆（10 個通用/占位圖 + 6 個 gkbot-adventure-run 專屬裝備圖）依同一套調色盤/外框慣例手繪，維持風格一致。

`PixelIconName` 共 23 種：`sword` `helmet` `potion` `shield` `chest` `boot` `ring` `hat` `tshirt` `hand`（通用/占位圖）＋ `wrench` `riotShield` `faceplate` `crateVest` `greaves` `chipRing` `engineOil` `techGoggles` `cargoBotPlate` `hydraulicArmGuard` `raiderGauntlet` `magnetRing` `magneticBoots`（13 個 per-template 專屬圖）。

### 2.1 每個 template 的專屬圖示（`TEMPLATE_ICON`）

| templateId | PixelIconName |
|---|---|
| `salvaged_wrench` | `wrench` |
| `raider_commander_gauntlet` | `raiderGauntlet` |
| `riot_shield_scrap` | `riotShield` |
| `hydraulic_arm_guard` | `hydraulicArmGuard` |
| `gkbot_faceplate` | `faceplate` |
| `tech_goggles` | `techGoggles` |
| `supply_crate_vest` | `crateVest` |
| `cargo_bot_plate` | `cargoBotPlate` |
| `servo_greaves` | `greaves` |
| `magnetic_work_boots` | `magneticBoots` |
| `research_chip_ring` | `chipRing` |
| `micro_magnet_ring` | `magnetRing` |
| `engine_oil_basic` | `engineOil` |

`scrap_daggers` 沒有專屬圖，走 2.2 的 fallback（`RIGHT_HAND → sword`）。

**Pixel icon 本身（圖案＋調色盤）不分稀有度，這是已落地的設計**：同一 template 不論落在哪個稀有度，`<GamePixelIcon>` 顯示的都是同一張 PNG，圖檔本身的顏色（palette）完全固定、不吃任何 rarity 參數。稀有度改變的是 icon **外部**的 UI 顏色——`RARITY_COLOR`（`equipmentDisplay.ts`）套用在裝備欄按鈕的邊框、稀有度徽章底色、數值文字顏色這三處，全部呼叫端都沒有把 `RARITY_COLOR` 傳進 `<GamePixelIcon>`。也就是說：「圖示相同，只有外部顏色不同」。

### 2.2 Fallback 規則

`resolvePixelIcon()`（`equipmentDisplay.ts`）的解析順序：

1. 先查 `TEMPLATE_ICON[templateId]`，命中就用該 template 的專屬圖（即上表）。
2. 沒命中（代表這是尚未指定專屬圖的新 template）：
   - 若 `type === 'POTION'`，一律 fallback 到通用 `potion` 圖示。
   - 若是 EQUIPMENT，依 `equipSlot` 查 `SLOT_FALLBACK_ITEM_ICON`：`HEAD→helmet`、`BODY→chest`、`SHOES→boot`、`LEFT_HAND→shield`、`RIGHT_HAND→sword`、`RING→ring`。
   - 若兩者都無（理論上不會發生），退回 `potion`。

另外 `SLOT_PIXEL_ICON`（`hat`/`tshirt`/`boot`/`hand`×2/`ring`）是**另一組**用途：首頁「裝備欄總覽」在該欄位**未裝備任何道具時**顯示的空欄占位圖示，與上述「已有道具但沒有專屬圖」的 fallback 邏輯是兩件事，不要混用。

## 3. 文案與稀有度的關係（設計已定案）

**同一 item 不論落在哪個稀有度，名稱／描述／圖示都相同，只有數值（`baseStatsRange`/`healPercentRange`/`priceRangeByRarity`）不同。** 這是刻意的設計決定，取代了先前「每個稀有度各自一份文案」的方向：

- `server/services/item.service.ts` 的 `generateItemInstance()` 直接取用 `template.name`/`template.description`，不再依 rolled rarity 查表。
- `shared/types/item.ts` 的 `ItemTemplate.name`/`description` 型別是單純 `string`（不是 per-rarity 的 `Record<Rarity, string>`）。
- 圖示同樣不分稀有度（已落地，見第 2 節）：pixel icon 圖案與調色盤固定，稀有度只影響 icon 外部的 `RARITY_COLOR`（邊框、稀有度徽章底色、數值文字顏色）。

`equipment-ideas.md` 裡「6 部位 × 6 則候補文案、依稀有度序對應、第 6 則併入替代外觀池」的映射方案（原第 4 節）已**不再採用**，未來若要規劃「同一部位有多個外觀不同的獨立道具」（例如額外的 template，而非同一 template 依稀有度變外觀），需要新開 `/opsx:propose` 討論，不會是靠拆分稀有度文案達成。`equipment-ideas.md` 的候補文案仍可作為未來新增獨立 template 時的文字素材池。

現有 13 個裝備 template 與 `engine_oil_basic` 的實際文案見第 1 節總覽表。

## 4. 內容缺口

1. **「替代外觀池」概念未落地**：`equipment-ideas.md` 設想的「同數值、不同外觀」隨機呈現（例如同一部位掉落時隨機挑一個外觀）目前沒有對應機制，也沒有 template 支援。
2. **每個裝備欄位仍缺一個 weaponWeightClass**：LEFT_HAND 缺 LIGHT、HEAD 缺 HEAVY、BODY 缺 LIGHT、SHOES 缺 MEDIUM、RING 缺 HEAVY（只有 RIGHT_HAND 三個 weaponWeightClass 都齊了）。`equipment-ideas.md` 每部位還各剩 4 則候補文案（6 則中已用 2 則：原本落地的 1 則已改寫成獨立文案不再使用候補池，加上這次新增的 1 則）未落地，可作為之後補齊的素材來源。
3. **戒指的「身份／記憶伏筆」尚未有 template 承接**：`equipment-ideas.md` 戒指第 6 則（陣亡倖存者的婚戒）伏筆最重，目前兩個戒指 template（`research_chip_ring`／`micro_magnet_ring`）都還沒用到這則。
