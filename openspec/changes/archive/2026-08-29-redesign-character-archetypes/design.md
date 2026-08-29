## Context

`server/constants/characterArchetypes.ts` 目前定義 4 個通用奇幻職業（barbarian/rogue/paladin/wanderer），純屬性分配、無職業特殊機制。`docs/worldview.md` 與 `character-design.md` 定案了世界觀：玩家是 GK 宇宙時間線下 GkBot 浩劫的倖存者，反覆深入「裂域」（GK 公司各類舊設施：補給/研究/維修/虛擬實境）求生；5 個新職業（Fighter/Adventurer/Scholar/Tinkerer/Gambler）是末日下走上不同求生路線的倖存者原型，每個職業有一個核心特色機制，分別要跨接到 `events-and-blessings`、`items-and-equipment`、`adventure-run-core`、`combat-engine` 這 4 個既有 in-progress change 定義的系統。

這些消費端 change 目前狀態：
- `events-and-blessings`：已定義 `blessings-and-curses` capability（Blessing/Curse 效果、RunModifier）
- `items-and-equipment`：已定義 `item-generation`/`inventory`/`equipment` capability
- `adventure-run-core`：已定義 `adventure-run-lifecycle`（節點生成、狀態機）、`deterministic-rng`
- `combat-engine`：已定義 `combat-engine` capability（傷害/掉落計算）

本 change 只新增「職業特殊機制」的資料結構與介面定案，不修改上述 4 個 change 的既有 spec，實際效果運算留給各自 change 後續實作（在各自 change 的 tasks 中引用本 change 定案的介面）。

## Goals / Non-Goals

**Goals:**
- 定案 5 個新職業的 `archetypeId`/`className`/初始屬性分配（總和固定 8，相容現有 `Attributes` 型別與 `attributesSchema.int().min(1)`），className 沿用 `docs/worldview.md` 已定案的中文譯名（戰士/冒險家/學者/工匠/投機者）
- 定案「職業特殊機制」的通用資料結構（`ArchetypeAbility`），讓 4 個消費端 change 有穩定介面可以實作
- 定案既有 4 個舊職業角色的相容性讀取規則（不刪除資料、不再開放選擇）

**Non-Goals:**
- 不實作任何職業特殊機制的效果運算邏輯（Physical Adaptation 增幅比例、Explorer 觸發機率、Study 記錄儲存、Salvage 掉落機率、Gambler 輪盤選項的實際結算，皆留給對應消費端 change）
- 不改動 `server/constants/stats.ts` 的 attributes → stats 計算公式
- 不新增/修改 `character-progression` 的屬性點分配 requirement（機制不變，只是分配對象換了職業初始值）
- 不處理既有角色的資料遷移搬動（採「保留不刪除」策略，見 Decisions）

## Decisions

### 1. 屬性分配：星等轉換為總和固定 8 的整數，四維最小值 1

`character-design.md` 的星等是相對強度示意，非可直接使用的數值。換算規則：以各職業星等總和為分母、8 為分子做比例縮放，四捨五入後若總和不等於 8，優先調整星等最高的維度湊足，且每維度不得低於 1（沿用 `attributesSchema` 的 `int().min(1)` 限制）。

換算結果：

| archetypeId | className | STR | AGI | CON | LUCK | 總和 |
| --- | --- | --: | --: | --: | --: | --: |
| `fighter` | 戰士 | 3 | 1 | 3 | 1 | 8 |
| `adventurer` | 冒險家 | 1 | 3 | 2 | 2 | 8 |
| `scholar` | 學者 | 4 | 1 | 1 | 2 | 8 |
| `tinkerer` | 工匠 | 1 | 2 | 3 | 2 | 8 |
| `gambler` | 投機者 | 1 | 2 | 1 | 4 | 8 |

**Alternatives considered**：直接沿用星等數字當屬性值（會超過總和 8 的限制，破壞現有「總和固定 8」的職業間平衡規則，且與 `attributesSchema` 不相容）→ 否決。

### 2. 舊職業：保留定義但標記不可選，不刪除既有角色資料

`CharacterArchetype` 型別新增 `isSelectable: boolean` 欄位。`CHARACTER_ARCHETYPES` 陣列同時保留 5 個新職業（`isSelectable: true`）與 4 個舊職業（`isSelectable: false`，重新歸類為 retired archetype）。

- `getArchetypeById()` 邏輯不變，任何 `archetypeId` 都查得到定義 → 既有角色查詢角色資料、算 stats、顯示 className/sprite 完全不受影響
- `GET /api/character/roster` 回傳的 `archetypes`（供建立新角色使用）只回傳 `isSelectable: true` 的 5 筆
- `POST /api/character` 建立新角色時驗證 `archetypeId` 必須是 `isSelectable: true` 的職業，否則 400

**Alternatives considered**：
- 直接砍掉舊職業定義 → 會讓既有角色查詢時 `getArchetypeById()` 查不到定義，className/sprite 顯示壞掉，違反「不強制遷移」的決定 → 否決
- 把舊角色遷移成 `LEGACY_ARCHETYPE_ID`（`legacy`，已存在的通用相容代碼）→ 會丟失舊角色原本職業的視覺/敘事區分（4 個舊職業美術資源仍然存在），且 `legacy` 語意是「多角色系統上線前的單角色相容」，語意不同，不應混用 → 否決

### 3. 職業特殊機制：定案為靜態資料 + 消費端各自查表使用

新增 `server/constants/archetypeAbilities.ts`，定義 `ArchetypeAbility` 型別與 5 筆靜態資料：

```ts
type ArchetypeAbilityTrigger =
  | 'blessing_effect_boost'   // Fighter: Physical Adaptation
  | 'non_combat_node_bonus'   // Adventurer: Explorer
  | 'enemy_encounter_record'  // Scholar: Study
  | 'salvage_material_drop'   // Tinkerer: Salvage
  | 'risk_reward_choice';     // Gambler: Risk & Reward

type ArchetypeAbility = {
    archetypeId: string;
    abilityId: string;
    trigger: ArchetypeAbilityTrigger;
    name: string;
    description: string; // 面向玩家的說明文字，數值細節由消費端決定後可用模板字串帶入
};
```

本 change 只保證每個新職業有一筆 `ArchetypeAbility` 資料、`trigger` 列舉值穩定可供其他 change import 使用做判斷分支；不定義任何機率/倍率數值常數（那些屬於各消費端 change 的職責，避免本 change 寫死之後又被覆蓋造成不一致）。

`description` 欄位的實際文案（面向玩家的說明文字）需比照 `docs/worldview.md` 的敘事原則撰寫：GK 宇宙時間線與裂域設定可以公開明講，但「玩家角色局部機械化」的真相（尤其 Tinkerer 的 Salvage——`docs/worldview.md` 第 4 節將其設計為全職業中最接近察覺真相的角色）只能透過語氣暗示，不可明講。本 change 只定案資料結構，實際文案內容留待內容撰寫階段完成。

**Alternatives considered**：把職業特殊機制的完整效果邏輯（機率、倍率）直接在本 change 定案 → 會與 4 個消費端 change 各自的 spec/design 產生重複定義來源，且部分消費端系統（如 `adventure-run-core` 的節點生成機率、`combat-engine` 的傷害公式）尚未支援職業修飾項的掛載點，貿然寫死數值容易脫節 → 否決，改為只定案穩定介面（trigger 列舉 + 資料形狀）。

## Risks / Trade-offs

- [Risk] `ArchetypeAbilityTrigger` 列舉值命名若與消費端 change 實際實作時的介面設計不一致，需要事後改名 → Mitigation：命名採用行為描述（非實作細節），且各消費端 change 的 proposal 已明確標示要「消費」哪個職業特色，實作前可再對齊一次
- [Risk] 舊職業標記 `isSelectable: false` 但美術資源與程式碼永久留存，長期會累積技術債 → Mitigation：不在本 change 處理，待未來確認不再需要舊角色相容性支援時，另開 change 清理
- [Risk] 星等轉換為整數屬性時的四捨五入取捨（例如 Fighter 的 AGI 從★★★被壓縮到 1）可能與 `character-design.md` 原意的相對強度感受有落差 → Mitigation：已在換算規則中固定「總和最高的維度優先湊分」的一致規則，並在 proposal 待確認事項中保留調整空間，正式數值若需要再平衡可在後續 change 微調（不影響本 change 的介面設計）

## Migration Plan

1. 新增 5 個新職業定義與 `isSelectable` 欄位（`characterArchetypes.ts`），舊 4 個職業定義加上 `isSelectable: false`
2. 新增 5 張新職業美術資源至 `public/images/archetypes/`
3. 更新 `character-roster` spec 的 Requirement/Scenario（角色範本數量 4→5、retired archetype 相容性情境）
4. 新增 `archetypeAbilities.ts` 靜態資料與型別
5. 前端角色建立畫面改用新的 5 職業清單渲染（沿用既有 `archetypes` API 回傳結構，只是內容從 4 筆變 5 筆，且已透過 `isSelectable` 過濾，前端不需額外邏輯）
6. 不做既有角色資料遷移（無需 Firestore migration script）：舊角色的 `archetypeId` 維持原值，讀取路徑不變

**Rollback**：純新增/標記變更，若需回滾只需把 `isSelectable` 全部改回 4 個舊職業為 `true`、5 個新職業為 `false`（或直接 revert commit），不涉及資料破壞性操作。

## Open Questions

- 5 個職業特殊機制的實際數值（沿用 proposal 的待確認事項）留待消費端 change 決定
- 是否需要在 `CharacterWithStats` API 回傳中附上 `archetypeAbility` 供前端顯示職業特色說明卡片，目前規劃為 `character-roster` 的 `archetypes` 回傳裡本來就含完整職業定義，前端可自行 join `archetypeAbilities.ts` 資料（若之後需要 server 端直接組裝，屬於前端串接時的小幅調整，不影響本設計）
