## Why

冒險頁面與戰鬥演出目前資訊密度低、演出感弱：HP 固定在頁面頂端與角色脫節、戰鬥只靠卡片抖動與 spark 圖表達命中/爆擊/閃避、敵我雙方沒有 avatar 只有純文字卡片、進入冒險與推進節點時背景/角色沒有任何場景感。這些是 `known-issue.md` 待辦事項，目標是讓冒險/戰鬥的視覺回饋更清楚、更有代入感。同時盤點過程中發現 4 個已停用（`isSelectable: false`）但從未實際被角色使用的職業 template 長期占用美術資產缺口，藉這次改版一併移除，收斂職業清單。

## What Changes

- 移除 `app/pages/adventure.vue` 中固定於頁面頂端的 HP 顯示，改為 HP 條、行動條浮動於角色身側
- 戰鬥演出強化：新增傷害飄字、閃避文字效果，普攻/爆擊圖示更顯眼
- 我方/敵方 panel 重新設計，加入 avatar 顯示（敵人 avatar 依 `faction × tier` 對應共用圖，不逐一敵人客製）
- 進入冒險時背景依當前節點的設施背景底圖顯示（依 `severityTier`/`currentNodeType` 對應）
- 顯示角色背面圖（僅 5 個現行可選職業：`fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler`）
- 點擊「推進」時播放角色走路動畫、背景呈現移動感（依賴背景底圖與角色背面圖已完成）
- 新增 `useCombat` composable，將 `combatResultPanel.vue` 內的 timeline 排程與 `sparkFx`/`cardFx`/新增的 `damageTextFx` 狀態抽出集中管理
- **BREAKING**：移除 `barbarian`/`rogue`/`paladin`/`wanderer` 4 個已停用職業的 template 資料（`server/constants/templates/characterArchetypes.ts`），一併移除相關「已停用職業」查表相容邏輯與其對應的 spec 需求

## Capabilities

### New Capabilities
- `adventure-run-presentation`：冒險頁面與戰鬥演出的視覺呈現規則 — 節點背景底圖對應、角色背面圖與走路動畫、HP/行動條浮動位置、戰鬥傷害飄字/閃避文字/爆擊圖示、敵我 panel 與 avatar 顯示

### Modified Capabilities
- `character-roster`：移除「查詢使用已停用職業的舊角色」需求與情境（已停用職業 template 一併刪除，不再保留相容顯示邏輯）
- `character-archetype-abilities`：移除「已停用舊職業沒有對應特色機制」情境（已停用職業概念本身移除，不再需要此查表相容行為）

## Impact

- **前端**：`app/pages/adventure.vue`、`app/components/game/combatResultPanel.vue`（大幅重構並拆出 `useCombat`）、`app/components/game/archetypeGallery.vue`（若有硬編碼列出已停用職業需一併清除）、新增 `public/images/` 下的背景/背面圖/敵人 avatar 資產
- **後端**：`server/constants/templates/characterArchetypes.ts` 移除 4 筆已停用 template
- **Spec**：`character-roster`、`character-archetype-abilities` 需同步移除已停用職業相關 Requirement/Scenario
- **資料相容性**：若既有 Firestore 角色資料中有 `archetypeId` 為這 4 個已停用職業，其角色頁 className/spriteUrl 查表將失敗（使用者已確認可接受，無需事先查證）
- **無 API contract 變更**：`EnemyPreview`/`CombatSummary` 等 schema 維持不變，敵人 avatar 採前端 `faction+tier` lookup
