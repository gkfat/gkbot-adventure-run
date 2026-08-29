## Why

目前的世界觀敘事（野蠻人/盜賊/聖騎士/流浪者）與美術是通用奇幻設定，跟 `docs/worldview.md` 定案的 GK 宇宙世界觀（GkBot 浩劫倖存者反覆深入「裂域」——GK 公司各類舊設施——求生）與 5 個貼近玩家自身背景的職業（戰士/冒險家/學者/工匠/投機者）不一致，且現有職業沒有任何差異化的職業特殊機制，無法支撐 roguelike run 的 build 多樣性。需要先把角色/職業這個所有系統共用的基礎定案，`events-and-blessings`、`items-and-equipment`、`adventure-run-core`、`combat-engine` 才能在後續實作中掛載對應的職業特殊機制。

## What Changes

- **BREAKING**：`server/constants/characterArchetypes.ts` 的 4 個可選職業（barbarian/rogue/paladin/wanderer）全面替換為 `character-design.md` 的 5 個新職業（fighter/adventurer/scholar/tinkerer/gambler），attributes 總和維持固定 8
- 更新角色建立、角色名冊查詢兩份 spec 的世界觀敘事與職業清單（4 → 5 個職業）
- 新增「職業特殊機制」為正式規格化的資料結構與介面（每個職業一個 passive ability，定義觸發時機與效果資料形狀），供 `events-and-blessings`（Physical Adaptation 影響 Blessing 效果）、`items-and-equipment`（Salvage 素材與轉化道具）、`adventure-run-core`（Explorer 節點機率、Study 記錄、Gambler 輪盤選項）、`combat-engine`（Study 額外傷害）在各自 change 中實作串接，本 change 只定案介面與資料結構，不落地效果運算邏輯
- 既有角色（4 個舊職業）維持可查詢與遊玩，不強制遷移或刪除資料，但新職業清單不再允許選擇舊職業建立新角色

## Capabilities

### New Capabilities
- `character-archetype-abilities`：5 個新職業各自的核心特色（Physical Adaptation / Explorer / Study / Salvage / Risk & Reward）之觸發時機、資料結構與跨系統介面定義

### Modified Capabilities
- `character-roster`：可選職業從 4 個改為 5 個（fighter/adventurer/scholar/tinkerer/gambler），世界觀敘事更新；既有舊職業（barbarian/rogue/paladin/wanderer）角色的相容性讀取規則新增為「retired archetype」情境（比照現有 legacy 角色的處理模式，不可再用於建立新角色，但既有角色資料與 className/spriteUrl 仍可正常查詢）

## Impact

- `server/constants/characterArchetypes.ts`：新增 5 個新職業定義、保留 4 個舊職業定義並標記為不可選（`isSelectable: false`），供既有角色查詢用
- `shared/types/character.ts` / `shared/schemas/api/character.schema.ts`：角色相關型別若需要暴露 `archetypeAbilityId` 供前端顯示職業特色說明，需擴充
- `public/images/archetypes/`：新增 5 個新職業美術資源（fighter/adventurer/scholar/tinkerer/gambler.png），舊 4 張圖保留供既有角色顯示
- `openspec/specs/character-roster/spec.md`：更新 Requirement 與 Scenario（4→5 職業、retired archetype 相容性情境）
- `openspec/specs/character-progression/spec.md`：不涉及 requirement 變更（屬性點分配機制不變），不需要 delta spec
- 不影響 `server/constants/stats.ts` 的 attributes → stats 計算公式
- `docs/worldview.md`：本 change 的世界觀敘事依據，5 個職業的定位（末日倖存者原型）與 `ArchetypeAbility.description` 文案撰寫需與其保持一致（尤其「GK 宇宙可公開、機械化真相僅限暗示」的原則）
- 跨系統依賴（各自 change 後續實作，本 change 只提供介面）：
  - `events-and-blessings`：消費 Fighter 的 Physical Adaptation 效果加成介面
  - `items-and-equipment`：消費 Tinkerer 的 Salvage 素材定義，可能需要新 item template type
  - `adventure-run-core`：消費 Adventurer 的 Explorer 節點機率介面、Scholar 的 Study 記錄介面、Gambler 的 Risk & Reward 節點選項介面
  - `combat-engine`：消費 Scholar 的 Study 對已記錄敵人類型的額外傷害介面

## 待確認事項

- 5 個職業特殊機制的實際數值強度（例如 Physical Adaptation 增幅比例、Explorer 觸發機率、Salvage 掉落機率）留待各自消費端的 change 定案，本 change 的 spec 只定義行為輪廓與資料結構，不寫死數值
