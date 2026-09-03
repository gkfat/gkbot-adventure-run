## Context

現行 Blessing 機制（`shared/constants/blessings.ts` / `server/services/blessing.service.ts`）：

- `BLESSING_TEMPLATES` 是 5 個扁平、獨立的效果，各自帶一個 `tier: 'MINOR' | 'MAJOR'`，只影響候選時的抽選機率（`majorTierChance(luck)`）。
- `BlessingService.generateCandidates()` 每次單純依 tier 機率抽 3 個「本次候選內不重複」的模板，跟玩家「已經擁有哪些 Blessing」完全無關——同一家族可以在同一次 run 被無意義地重複抽中兩次（`resolveActiveModifiers` 會把兩筆都攤平套用，等同疊加兩次同樣效果，並非設計意圖，是現行機制的副作用）。
- `AdventureRun.blessings: string[]` 只存 modifierId，`combat.service.ts` 的 `resolveActiveModifiers()` 直接用 id 查表拿到固定效果值。

本次改動把「重複抽到同一家族」變成有意義的行為（升級），並讓 rarity 這個原本只跟機率有關的欄位語意更清楚（跟「等級」分開）。

## Goals / Non-Goals

**Goals:**
- Blessing 分等級（Lv1~Lv3），同一家族的效果數值隨等級遞增，name/description 不隨等級改變。
- 候選生成同時考慮「家族目前等級」（決定下一次可提供的等級）與「rarity + LUCK」（決定候選加權），兩者正交、互不影響彼此的判斷順序。
- 選擇候選後，同家族原地升級（取代舊效果數值），不同家族則新增一筆。
- Blessing 模板數量足以讓大多數 run 不會把所有家族點滿 Lv3。

**Non-Goals:**
- 不改動 Curse 機制（保持扁平、無等級、無 rarity）。
- 不做「等級點數重新分配/洗點」之類的玩家操作。
- 不處理歷史 run 文件的資料遷移（見下方 Migration Plan）。
- 不重新設計 `blessingPoints` 累積門檻機制（觸發 BLESSING_SELECT 的時機不變）。

## Decisions

### 1. 模板結構：單一家族 + `levels` 陣列，而非展開成多筆模板

```ts
export type BlessingRarity = 'COMMON' | 'RARE' | 'EPIC';

export type BlessingLevelEffect = Pick<RunModifier, 'statModifiers' | 'dropRateMultiplier'>;

export type BlessingTemplate = {
    modifierId: string;
    name: string;
    description: string;
    isBlessing: true;
    rarity: BlessingRarity;
    levels: [BlessingLevelEffect, BlessingLevelEffect, BlessingLevelEffect]; // Lv1, Lv2, Lv3
};
```

取代原本 `BlessingTemplate = RunModifier & { tier }`。`RunModifier`（套用到戰鬥數值計算的最終形狀）不變，只是「取值」時要先用 `level` 從 `levels[level - 1]` 展開成 `RunModifier`。

- 選擇原因：`name`/`description` 三級共用，若展開成 15 筆模板會讓三筆資料的「同一家族」關聯完全隱性（只能靠 modifierId 前綴猜），未來調整某家族的手感要改三處。單一模板 + `levels` 讓家族是結構化的一等公民。
- 考慮過的替代方案：15 筆獨立模板 + `family` 欄位分組——維護三份幾乎一樣的 name/description 容易漂移，且 candidate 生成邏輯還是得先 group by family 才能算「下一個可提供等級」，並沒有比較簡單。

### 2. `rarity` 取代 `tier`，機率邏輯從 2 級擴成 3 級

`tier: 'MINOR' | 'MAJOR'` 重新命名為 `rarity: 'COMMON' | 'RARE' | 'EPIC'`，語意從「機率權重」延伸為「這個家族的基礎品質」（rarity 越高，`levels` 內的數值越好——由內容作者在定義模板時自行決定數值，不是公式推導）。

`majorTierChance(luck)`（2 級加權）改寫成 3 級版本，例如：

```
rarityWeights(luck) = { COMMON: w_c(luck), RARE: w_r(luck), EPIC: w_e(luck) }
```

沿用「LUCK 越高，越容易偏向高稀有度」的既有精神，具體權重曲線由實作時調整（沿用 `BASE_*_WEIGHT` / `*_WEIGHT_PER_LUCK` / `*_WEIGHT_CAP` 的參數化風格）。

- 選擇原因：使用者明確要求 COMMON/RARE/EPIC 三級，且要與 Lv1~3 的「升級」概念在語意上區分開（rarity=家族品質，level=家族目前練到第幾階）。
- 風險：3 級加權比 2 級複雜，且要跟「家族是否已提供候選資格」的過濾疊在一起做（見 Decision 3）。

### 3. 候選生成：先過濾「可提供的等級」，再用 rarity 加權抽選

```
for 家族 in BLESSING_TEMPLATES:
    ownedLevel = 玩家目前擁有的等級（0 = 未擁有）
    if ownedLevel >= 3: 排除（已滿級）
    else: nextLevel = ownedLevel + 1  // 這個家族「這次」若被抽中要給的等級

eligiblePool = 上面沒被排除的家族
從 eligiblePool 中，依 rarity + LUCK 加權、不重複地抽 3 個候選
每個候選帶著各自算好的 nextLevel，展開 levels[nextLevel - 1] 成候選要顯示/套用的效果
```

延續現行 `generateCandidates()` 「偏好池為空時退回全池」的 fallback 寫法，只是「全池」的定義從「所有模板」改成「eligiblePool」。

- 選擇原因：等級可提供性（家族維度）與 rarity 加權（機率維度）是兩個獨立問題，先過濾掉不合法的家族，再用既有加權邏輯抽選，改動幅度最小、也最容易各自測試。
- 替代方案：把「已滿級」也當成 rarity 的一種特殊狀態去加權——會讓加權函式同時處理兩種語意，混淆且難測。

### 4. 儲存結構改動 + 套用邏輯

`AdventureRun.blessings: string[]` → `{ modifierId: string; level: number }[]`（**BREAKING**，測試資料直接改型別）。

`combat.service.ts` 的 `resolveActiveModifiers()` 需要分開處理 blessings（level-aware：查模板後用 `levels[level-1]` 展開）與 curses（維持原本 id 直查）：

```ts
function resolveBlessingModifier(entry: { modifierId: string; level: number }): RunModifier | undefined {
    const template = BLESSING_TEMPLATES_BY_ID[entry.modifierId];
    if (!template) return undefined;
    const effect = template.levels[entry.level - 1];
    return { modifierId: template.modifierId, name: template.name, description: template.description, isBlessing: true, ...effect };
}
```

`adventure-run.service.ts` 的 `findModifierTemplate(modifierId)?.statModifiers?.HP_MAX`（`playerHpMax` 基準值調整用）也要改成用 Lv1 效果或改吃已展開的 `RunModifier`——需在實作時確認呼叫點的實際語意（見 Open Questions）。

### 5. 選擇 Blessing 時的新增 vs 升級判斷

`blessing/select.post.ts`：
- 候選本身已經帶著「這次要給的 level」（由候選生成階段算好，選擇端不重新計算），選中後：
  - 家族不在 `run.blessings` 中 → push `{ modifierId, level: 1 }`
  - 家族已在 `run.blessings` 中（level = N）→ 該筆的 `level` 更新為 `N + 1`

## Risks / Trade-offs

- [Risk] 候選生成邏輯同時處理「等級過濾」+「rarity 加權」+「不重複抽選」，邏輯複雜度上升，容易在邊界情況（例如 eligiblePool 為空）出錯 → Mitigation：沿用現行單元測試風格（`blessing.service.test.ts`）逐一測「全部未擁有」「部分滿級」「全部滿級」情境。
- [Risk] `resolveActiveModifiers()` 拆成 blessing/curse 兩條路徑後，若未來新增其他 RunModifier 來源，容易忘記其中一條路徑要同步改 → Mitigation：保持函式簽章回傳統一的 `RunModifier[]`，內部拆分即可，呼叫端不受影響。
- [Trade-off] `levels` 用固定長度 3 元組（非公式生成）表示要多寫比較多資料，但符合使用者「各自定義等級加成的數值」的明確要求，且比公式更容易個別調數值。

## Migration Plan

- `AdventureRun.blessings` 目前為 run-scoped 短生命週期資料且皆為測試資料，直接修改型別與 Zod schema，不寫遷移程式、不相容舊格式。
- 部署前確認沒有進行中的正式 run 依賴舊格式（開發/測試環境即可，無需正式環境遷移腳本）。

## Open Questions

- `adventure-run.service.ts` 內 `findModifierTemplate(modifierId)?.statModifiers?.HP_MAX` 這類直接讀模板 `statModifiers` 的呼叫點，改成 `levels` 結構後要接哪個等級的值（Lv1 固定，還是讀該家族目前等級）？需要在 apply 階段對照原始呼叫語境確認。
- rarity 三級的實際權重曲線數值（`w_c/w_r/w_e` 隨 LUCK 的成長率與上限）留待實作時比照現行 `BASE_MINOR_WEIGHT`/`MAJOR_WEIGHT_CAP` 的手感調整，非本設計文件需要釘死的數字。
- 新增的 Blessing 家族數量與內容（COMMON/RARE/EPIC 各補幾個）留給 tasks 階段作為內容產出項目，非架構決策。
