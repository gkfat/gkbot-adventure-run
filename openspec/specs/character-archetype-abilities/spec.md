# character-archetype-abilities

## Purpose

定義每個可選職業的核心特色機制靜態資料（`ArchetypeAbility`），供其他消費端系統（events/items/adventure-run/combat）查表判斷職業特色，不涉及實際效果數值運算。

## Requirements

### Requirement: 每個可選職業定義一個核心特色機制
系統 SHALL 為 5 個可選職業（`fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler`）各定義恰好一筆 `ArchetypeAbility` 靜態資料，包含 `archetypeId`、`abilityId`、`trigger`（穩定列舉值）、`name`、`description`。`trigger` 列舉值 SHALL 涵蓋以下 5 種，且每個職業對應唯一一種：
- `blessing_effect_boost`（戰士 Physical Adaptation：提升身體能力類 Blessing 的效果加成）
- `non_combat_node_bonus`（冒險家 Explorer：經過非戰鬥節點有機率發現額外內容）
- `enemy_encounter_record`（學者 Study：記錄遭遇過的敵人/事件類型，再次遭遇獲得額外效果）
- `salvage_material_drop`（工匠 Salvage：擊敗機械類敵人或開寶箱有機率獲得可轉化的素材）
- `risk_reward_choice`（投機者 Gambler：在輪盤/事件節點提供額外高風險高回報選項）

本 Requirement 只定案資料結構與 `trigger` 列舉值供其他系統查表使用，不定義任何機率、倍率或數值常數；實際效果運算由消費端系統各自的 change 實作。

#### Scenario: 查表取得職業特色定義
- **WHEN** 任一消費端系統（events/items/adventure-run/combat）需要判斷某職業是否具備特定類型的特色機制
- **THEN** 可用 `archetypeId` 查得唯一一筆 `ArchetypeAbility`，並依 `trigger` 值分支處理，不需要額外硬編碼職業與機制的對應關係

#### Scenario: 已停用舊職業沒有對應特色機制
- **WHEN** 查詢已停用（retired）的舊職業（`barbarian`/`rogue`/`paladin`/`wanderer`）的 `ArchetypeAbility`
- **THEN** 系統回傳查無資料（舊職業不具備任何新版核心特色機制），不影響其角色既有的 attributes/stats 運作
