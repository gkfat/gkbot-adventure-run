# 道具內容目錄（templates／圖示／文案落地狀態）

> 本文件是內部設計參考文件，與 `docs/game-design/item-drop-and-stats.md` 分工互補：
> - `item-drop-and-stats.md` 負責**數值面**——稀有度掉落權重、屬性區間、售價區間，把 `equipment-ideas.md` 的候補文案對應到現有數值曲線。
> - 本文件負責**內容清單面**——目前實際存在哪些道具模板（`ITEM_TEMPLATES`）、對應哪個像素圖示、`equipment-ideas.md` 的文案候補中哪些已經真正落地成 code。
>
> 數值/掉落率/售價一律不重複列在這裡，需要時請連結到 `item-drop-and-stats.md` 對應章節。權威資料來源：`server/constants/templates.ts`（`ITEM_TEMPLATES`）、`app/utils/pixelIcons.ts`、`app/utils/equipmentDisplay.ts`、`shared/types/item.ts`。

## 0. 型別背景

依 `shared/types/item.ts`：

- `ItemType`：`EQUIPMENT` / `POTION`
- `EquipmentSlot`（`shared/types/common.ts`）：`HEAD` / `BODY` / `SHOES` / `LEFT_HAND` / `RIGHT_HAND` / `RING`
- 每個 `ItemTemplate` 目前是**單一** `name`/`description` 字串，橫跨 N~L 五個稀有度共用同一份文案與同一條數值曲線（`rarityWeights`、`baseStatsRange`/`healPercentRange`、`priceRangeByRarity`）——這點也是第 5 節「內容缺口」的核心。

## 1. 道具模板總覽表

目前 `ITEM_TEMPLATES` 共 7 筆，來源：`server/constants/templates.ts`。

| templateId | 名稱 | 類型 | 裝備欄位 | weaponWeightClass | 一句話描述 |
|---|---|---|---|---|---|
| `salvaged_wrench` | 維修殘骸扳手 | EQUIPMENT | RIGHT_HAND | MEDIUM | 從維修設施殘骸堆挖出的重型扳手，握把留著前使用者的手汗痕跡 |
| `riot_shield_scrap` | 拾荒防爆盾 | EQUIPMENT | LEFT_HAND | HEAVY | 補給設施保全機具的防爆盾殘件，扛起來莫名順手 |
| `gkbot_faceplate` | GkBot 頭部殘片 | EQUIPMENT | HEAD | MEDIUM | 拆自失控 GkBot 的頭部外殼，戴上有種說不出的熟悉感 |
| `supply_crate_vest` | 補給箱改造護甲 | EQUIPMENT | BODY | HEAVY | 拆解自倉儲區自動販賣機外殼焊接而成，內襯印著褪色 GK 公司標語 |
| `servo_greaves` | 伺服關節護脛 | EQUIPMENT | SHOES | LIGHT | 維修型 GkBot 淘汰下來的腿部伺服機構，接上後走路輕快得不太自然 |
| `research_chip_ring` | 殘留運算晶片戒 | EQUIPMENT | RING | LIGHT | 研究設施實驗品拆下的運算晶片，戴著它思考反應快得連自己都嚇一跳 |
| `engine_oil_basic` | 機油 | POTION | — | — | 「為什麼喝機油會補血...？但真好喝，咕嚕咕嚕咕嚕。」 |

`weaponWeightClass`（LIGHT/MEDIUM/HEAVY）是速度/主屬性/閃避的取捨分類，掛在 template 層、不隨稀有度變化；機制與各分類走向規則見 `item-drop-and-stats.md`「裝備重量分類」章節。

各 template 的完整數值曲線（分稀有度的 ATK/DEF/HP/actionSpeedMod/dodgeChanceMod/healPercent 區間、售價區間）見 `item-drop-and-stats.md` 對應章節：頭部 / 身體 / 左手 / 右手 / 戒指 / 鞋子 / 藥水。

裝備 6 個欄位（HEAD/BODY/SHOES/LEFT_HAND/RIGHT_HAND/RING）目前每欄各 1 個 template，加上藥水 1 個，剛好對齊 7 筆。

## 2. 圖示對照表

來源：`app/utils/pixelIcons.ts`（`PixelIconName` 型別 + `PIXEL_ICON_GRIDS`）、`app/utils/equipmentDisplay.ts`（`TEMPLATE_ICON`、`SLOT_FALLBACK_ITEM_ICON`、`SLOT_PIXEL_ICON`）。

`PixelIconName` 共 17 種：`sword` `helmet` `potion` `shield` `chest` `boot` `ring` `hat` `tshirt` `hand`（通用/占位圖）＋ `wrench` `riotShield` `faceplate` `crateVest` `greaves` `chipRing` `engineOil`（7 個 per-template 專屬圖）。

### 2.1 每個 template 的專屬圖示（`TEMPLATE_ICON`）

| templateId | PixelIconName |
|---|---|
| `salvaged_wrench` | `wrench` |
| `riot_shield_scrap` | `riotShield` |
| `gkbot_faceplate` | `faceplate` |
| `supply_crate_vest` | `crateVest` |
| `servo_greaves` | `greaves` |
| `research_chip_ring` | `chipRing` |
| `engine_oil_basic` | `engineOil` |

### 2.2 Fallback 規則

`resolvePixelIcon()`（`equipmentDisplay.ts`）的解析順序：

1. 先查 `TEMPLATE_ICON[templateId]`，命中就用該 template 的專屬圖（即上表）。
2. 沒命中（代表這是尚未指定專屬圖的新 template）：
   - 若 `type === 'POTION'`，一律 fallback 到通用 `potion` 圖示。
   - 若是 EQUIPMENT，依 `equipSlot` 查 `SLOT_FALLBACK_ITEM_ICON`：`HEAD→helmet`、`BODY→chest`、`SHOES→boot`、`LEFT_HAND→shield`、`RIGHT_HAND→sword`、`RING→ring`。
   - 若兩者都無（理論上不會發生），退回 `potion`。

另外 `SLOT_PIXEL_ICON`（`hat`/`tshirt`/`boot`/`hand`×2/`ring`）是**另一組**用途：首頁「裝備欄總覽」在該欄位**未裝備任何道具時**顯示的空欄占位圖示，與上述「已有道具但沒有專屬圖」的 fallback 邏輯是兩件事，不要混用。

## 3. 文案落地狀態

對照 `equipment-ideas.md`（6 部位 × 6 則候補文案）與現有 7 個 template：

| 部位 | equipment-ideas.md 候補則數 | 已落地為 template 的則數 | 落地內容 |
|---|---|---|---|
| 頭部 Head | 6（含 1 則替代款） | 0（現有 `gkbot_faceplate` 文案是全新寫的，不在候補清單中） | 見下方說明 |
| 身體 Body | 6（含 1 則替代款） | 0（`supply_crate_vest` 同樣是另寫文案） | 見下方說明 |
| 左手 Left Hand | 6（含 1 則替代款） | 0（`riot_shield_scrap` 另寫） | 見下方說明 |
| 右手 Right Hand | 6（含 1 則替代款） | 0（`salvaged_wrench` 另寫） | 見下方說明 |
| 戒指 Ring | 6（含 1 則替代款） | 0（`research_chip_ring` 另寫） | 見下方說明 |
| 鞋子 Feet | 6（含 1 則替代款） | 0（`servo_greaves` 另寫） | 見下方說明 |
| 藥水 Potion | — | 1（`engine_oil_basic`） | 直接落地，且文案幾乎逐字對應 `worldview.md` 4.1 節給的範例台詞 |

**說明**：`item-drop-and-stats.md` 的「對應規則」章節設計了一套映射方式——把 `equipment-ideas.md` 每個部位的 6 則候補文案依稀有度序（N→L，取前 5 則）對應到該部位的稀有度曲線，第 6 則併入 SSR（戒指例外為 L）的「替代外觀池」。這套映射**設計面已定案**，完整文案對照見第 4 節；但**尚未真正寫進 code**：目前 6 個裝備 template 的 `name`/`description` 都還是重新撰寫、單一固定字串，不是 `equipment-ideas.md` 候補清單裡的任何一則。也就是說：

- `equipment-ideas.md` 的 36 則裝備候補文案（6 部位 × 6 則）→ 稀有度對照設計已定案（第 4 節），但 code 落地率仍是 **0 / 36**，全部仍停留在草案階段。
- 藥水的候補基調（`worldview.md` 4.1）→ 已落地 1 則（`engine_oil_basic`），但同樣是單一字串，未依稀有度分級撰寫。

## 4. 稀有度文案對照（設計定案，待落地）

依 `item-drop-and-stats.md`「對應規則」，把 `equipment-ideas.md` 每部位 6 則文案依 N→L 序對應到稀有度曲線，第 6 則併入替代外觀池（戒指例外，見下方備註）。此處為**完整文案定案版**（名稱＋description），數值/售價不重複列出，見 `item-drop-and-stats.md` 對應章節。

### 頭部 Head（對應 `gkbot_faceplate`）

| 稀有度 | 名稱 | Description |
|---|---|---|
| N | GkBot 的頭部零件 | 從 GKBot 施工型機器人頭部拆解下來的零部件。不曉得為什麼，好像有些卡榫能夠對到頭部的某些輪廓。 |
| R | 維修技師護目鏡 | 用來檢查精密零件的護目鏡。戴上它之後，總能第一時間看出哪一台機器「快壞了」。 |
| SR | 破損的技術人員校準頭盔 | 研究設施裡找到的實驗型頭盔，標籤寫著「僅供校準用途」。戴上後，視野角落偶爾會閃過一些看不懂的數字。 |
| SSR | 退役保全頭盔 | 厚重得不像是給人戴的，內側還留著前任保全的名字。 |
| SSR（替代款） | 掠奪者拼裝面罩 | 用防毒面具殘骸和金屬片拼湊出來的面罩，內側刻著好幾個不同的名字，一個一個被劃掉。戴上它時，你刻意不去想這代表什麼。 |
| L | 黑色訊號罩 | 由不明材質製成的薄型頭罩，能降低周遭的電子干擾。戴久了以後，摘下來反而讓你覺得四周太吵。 |

### 身體 Body（對應 `supply_crate_vest`）

| 稀有度 | 名稱 | Description |
|---|---|---|
| N | 工程防護背心 | 維修人員的標準裝備，口袋多得離譜。穿上後，搬零件、爬管線、鑽維修孔都變得順手許多。 |
| R | 防爆維修外套 | 厚重的耐熱外套，原本是給工廠技師使用的。 |
| SR | 實驗室隔離衣 | 研究設施裡留下的防護服。材質柔軟得不像防護裝備，胸口卻偶爾會傳來細微的震動。 |
| SSR | GkBot 搬運工背甲 | 從大型搬運機器上拆下來的防撞裝甲。正常人穿著它大概只能慢慢走，但你似乎很快就習慣了它的重量。 |
| SSR（替代款） | 私兵繳獲護甲 | 從盤據某座設施的武裝勢力身上扒下來的護甲，補丁疊著補丁，每一塊來源都不太一樣。原主人顯然靠搶奪其他倖存者的裝備活了很久——直到遇見你。 |
| L | 緊急維生外套 | 設計給長時間困在廢棄設施裡的維修人員使用，內建保溫、濾氣與簡易供能模組。你不確定最後一項功能是做什麼的，但它好像確實有在運作。 |

### 左手 Left Hand（對應 `riot_shield_scrap`）

| 稀有度 | 名稱 | Description |
|---|---|---|
| N | 工程護腕 | 普通的工程護腕，能減少搬運重物時手腕受到的衝擊。戴上之後，你開始覺得螺絲起子特別順手。 |
| R | 磁吸工具腕帶 | 能把小型工具固定在手腕上的實用裝備。奇怪的是，有幾次工具明明掉在地上，卻自己滾回了你的腳邊。 |
| SR | 維修端子手套 | 原本用來接觸裸露電路的絕緣手套。戴上後，你似乎能感覺到附近設備的電流流向。 |
| SSR | 液壓作業護臂 | 拆自工廠重型機械的輔助護臂。啟動時會發出低沉的嗡鳴聲，你的手臂卻沒有想像中那麼沉。 |
| SSR（替代款） | 掠奪者綁帶護具 | 用皮革、膠帶和不知名倖存者的背包織帶纏成的護臂，纏繞方式一看就是慣於搶劫的人才會用。你戴上它時，動作莫名變得很俐落。 |
| L | 舊式校準手環 | 研究設施裡找到的測試設備。沒有電池、沒有開關，卻總能在你需要的時候亮起來。 |

### 右手 Right Hand（對應 `salvaged_wrench`）

| 稀有度 | 名稱 | Description |
|---|---|---|
| N | 防割工作手套 | 普通的厚實工作手套，能抵禦碎金屬與鋒利零件。手指活動起來意外地靈活。 |
| R | 精密維修手套 | 給 GK 精密技師使用的薄型手套，可以放大細微的觸覺反饋。你第一次戴上時，甚至能分辨出牆後齒輪轉動的節奏。 |
| SR | 電弧絕緣手套 | 原本是為高壓設備維修設計的防護手套。手掌內側有一層奇怪的金屬網，摸起來竟然有些溫熱。 |
| SSR | GkBot 維修夾具 | 嚴格來說，這不是給人使用的工具。裝上手腕後卻異常服貼，連接處還會自動調整鬆緊。 |
| SSR（替代款） | 佔領軍指揮官護手 | 擊敗某支武裝勢力的頭目後拿到的護手，握把處還留著別人的掌紋。你戴上去的瞬間，握感竟然比自己原本的手套還合。 |
| L | 應急接線手套 | 能快速連接斷裂電路的緊急維修裝備。說明書提醒使用者「請勿直接接觸自身接口」——你不知道為什麼會特別注意到這句話。 |

### 戒指 Ring（對應 `research_chip_ring`）

| 稀有度 | 名稱 | Description |
|---|---|---|
| N | GK 員工識別環 | 不知道是哪個年代的員工識別裝置。晶片早已失效，但某些廢棄設施的門禁看見它時，偶爾還是會亮一下綠燈。 |
| R | 備用記憶環 | 原本用來保存少量工作資料的可攜式儲存裝置。裡面的資料全毀了，只有一個檔案一直無法刪除。 |
| SR | 微型磁力環 | 簡單的工業用磁力裝置。靠近散落零件時會微微發熱，偶爾還會讓附近的小螺絲自己滾過來。 |
| SSR | 實驗型同步環 | 研究設施中的未完成實驗品。戴上後，你會偶爾在機器啟動前就知道它準備做什麼。 |
| L | 無標記黑環 | 沒有品牌、沒有序號，也找不到任何製造紀錄。它戴起來很舒服，舒服得讓你不太想把它拿下來。 |
| L（替代款） | 陣亡倖存者的婚戒 | 從某個被搶劫殺害的倖存者身上取下的戒指，內側刻著一個名字和一個日期。你猜不出那個人是死於 GkBot，還是死於搶走這枚戒指的人手上。 |

> 戒指的替代款掛在 L 而非 SSR，因為婚戒的伏筆最重，呼應「戒指承擔身份／記憶伏筆」的既定方向（`item-drop-and-stats.md` 已註記）。

### 鞋子 Feet（對應 `servo_greaves`）

| 稀有度 | 名稱 | Description |
|---|---|---|
| N | 工程安全靴 | 鋼頭、防穿刺、防滑，標準的 GK 工程人員安全靴。鞋底磨損嚴重，卻比你找到的大多數新鞋都好走。 |
| R | 維修通道靴 | 專門給需要長時間走在金屬管線上的技師使用。鞋底能牢牢抓住濕滑鋼板，讓你走過垂直維修梯時也異常穩。 |
| SR | 靜音工作鞋 | 娛樂設施的維修人員使用的特殊鞋款，幾乎不會發出腳步聲。穿上後，你甚至開始嫌普通鞋走路太吵。 |
| SSR | 磁力作業靴 | 工廠高空維修用的磁吸靴。啟動後能牢牢吸住金屬地面，但你有時會忘記自己其實還沒有開啟它。 |
| SSR（替代款） | 掠奪者踏勘靴 | 底部縫著防滑鐵片、鞋面刻意做舊的作戰靴，明顯是慣於長期埋伏、偷襲落單目標的人穿的鞋款。你穿上後走路特別安靜，安靜得連自己都有點不安。 |
| L | 回收型動力靴 | 從某台報廢 GkBot 身上拆下來的實驗裝備。每走一步都會回收少量動能，鞋底偶爾傳來細微的機械聲。 |

完整原文與文案方向備註（機械化身體的暗示、GK 設施來源、末世盜賊團設定、稀有度越高違和感越重）見 `equipment-ideas.md`。

## 5. 內容缺口

1. **每個裝備欄位僅 1 個 template，橫跨 5 個稀有度**：目前 `salvaged_wrench`/`riot_shield_scrap`/`gkbot_faceplate`/`supply_crate_vest`/`servo_greaves`/`research_chip_ring` 各自只有一筆 `ItemTemplate`，用同一個 `name`/`description` 搭配 `baseStatsRange` 裡分稀有度的數值區間來呈現「同一把扳手，數值隨稀有度變強」，而非 `equipment-ideas.md` 設想的「每個稀有度是外觀/敘述都不同的獨立道具」。
2. **稀有度文案對照（第 4 節）已定案，但尚未拆成多個 template**：要落地「每個稀有度獨立文案」，依 `item-drop-and-stats.md` 文末「落地備註」，有兩種路徑：
   - 擴充 `ItemTemplate.name`/`description` 為依稀有度變化的欄位（維持 1 個 templateId／欄位）；或
   - 拆成多個 template（例如 `salvaged_wrench_n`、`salvaged_wrench_r`…），並各自設定 `rarityWeights`。
   兩者都動到 `ItemTemplate` 資料結構或 template 數量，屬於功能擴充，須先進 `/opsx:propose` 討論再實作，本文件不預先決定方向。
3. **「替代外觀池」（equipment-ideas.md 第 6 則文案）完全未落地**：SSR/L 的替代款設計（例如頭部的「掠奪者拼裝面罩」、戒指的「陣亡倖存者的婚戒」）目前沒有對應 template，也沒有機制支援「同數值、不同外觀」的隨機呈現。
4. **圖示尚未跟著稀有度分級**：`TEMPLATE_ICON` 是 templateId → 單一 PixelIconName 的對照，現況下每個 template 不論落在哪個稀有度都用同一張圖；若未來落地多 template/多文案，需要一併評估是否也要有對應的分稀有度圖示，本文件不預先假設答案。
