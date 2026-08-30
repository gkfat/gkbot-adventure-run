## Why

`docs/worldview.md` 第 3 節「設施風險分級與敵對陣營」、第 7 節「怪物範本命名基準」已定案世界觀：每趟遠征(run)造訪的設施有風險分級之分，且機械(GkBot)/人類(末世盜賊團)雙陣營各自有完整的 8 小兵 + 8 頭目命名基準。目前戰鬥引擎完全沒有落實這些——所有敵人一律共用同一份 `ENEMY_ARCHETYPES`(僅 4 隻 GkBot 風味)，頭目只是小兵疊加 `BOSS` tier 倍率算出來的放大版，也沒有任何「這趟遠征比較危險/比較安全」的機制反映在數值上。這次要把世界觀定案的內容落成實際的資料與生成規則。

## What Changes

- 新增「設施風險分級」：`createRun` 時依角色的持久進度(`chapterIndex`)以動態機率(仿照 `difficulty.ts` 既有 `scaledChance` 手法，越後面越容易抽到高分級，但機率設上限，永遠保留隨機性)決定性 RNG 決定該趟遠征的 `severityTier`(`DEEP_WRECK`/`PARTIAL_ACTIVE`/`HIGHLY_ACTIVE`)，整趟 run 固定不變，疊加影響敵人數量機率(wave/enemy count)與 hp/atk/def 倍率(減法傷害模型 `damage = max(1, ATK-DEF)` 下，DEF 倍率刻意保守，避免打到傷害地板值)
- 新增「敵對陣營」：`createRun` 時再依 `severityTier` 加權骰一次 `factionType`(`GKBOT`/`HUMAN`)，整趟 run 固定；`severityTier` 越高，`HUMAN` 機率越高，但 `DEEP_WRECK` 分級下仍保留較低機率的「零星人類/合成人」
- 擴充敵人範本規模：GkBot 與末世盜賊團陣營**各自** 8 隻小兵 + 8 隻獨立命名頭目(共 32 隻，取代現行 4 隻)；頭目不再是「小兵疊 BOSS tier 倍率」，而是各自獨立的 baseAtk/baseDef/baseHp 模板，仍隨 `enemyLevel` 縮放但不再額外疊加 `BOSS` tier 倍率
- 新增每隻怪物獨立的 LUK(爆擊/閃避傾向)覆寫欄位，取代現行全域共用的 `ENEMY_COMBAT_STATS`，讓「靈巧型」敵人(高 LUK)在爆擊率/閃避率上與「笨重型」敵人(無覆寫)產生手感差異
- 修改敵人生成邏輯：依 run 的 `factionType` 選用對應陣營的小兵/頭目清單；依 `severityTier` 調整數量機率與數值倍率
- 修改冒險畫面：Stage(即整趟 run)開始畫面明講本趟遠征的分級與陣營，讓玩家有心理預期

## Capabilities

### Modified Capabilities
- `adventure-run-lifecycle`：`createRun` 時新增 `severityTier`/`factionType` 的決定性 RNG 決策
- `combat-engine`：敵人生成依陣營選用擴充後的範本清單(32 隻)、頭目改走獨立清單；hp/atk/def 倍率、wave/enemy count 機率疊加 `severityTier` 調整；敵人爆擊/閃避改依個別模板的 LUK 覆寫值決定

## Impact

- `shared/types/adventure.ts`：新增 `FacilitySeverity`、`EnemyFaction` 型別；`AdventureRun` 新增 `severityTier`/`factionType`(不加 `chapter` 前綴——現行模型一個 run 就是一趟遠征，不再有章節內多 Stage 的結構)；新增 `SEVERITY_CONFIG`(依 `chapterIndex` 動態機率公式、stat/wave 倍率、faction 機率)；`Enemy` 型別新增 `faction` 欄位
- `server/constants/combat.ts`：`EnemyArchetype` 型別新增可選的 `critChanceOverride`/`dodgeChanceOverride`(LUK 覆寫)；`ENEMY_ARCHETYPES`(GkBot 小兵)擴充為 8 隻；新增 `GKBOT_BOSS_ARCHETYPES`(8 隻)、`HUMAN_ARCHETYPES`(8 隻小兵)、`HUMAN_BOSS_ARCHETYPES`(8 隻頭目)
- `shared/schemas/firestore/adventure.schema.ts`：`adventureRunSchema` 新增 `severityTier`/`factionType` 對應的 zod schema
- `server/services/adventure-run.service.ts`／`server/repositories/adventure-run.repository.ts`：`createRun` 依 `chapterIndex` roll `severityTier`/`factionType`
- `server/services/combat.service.ts`：範本選用依 `factionType` 切換清單；Boss 節點從對應陣營的頭目清單抽取(不再對小兵疊加 BOSS tier 倍率)；套用 `severityTier` 的數量機率與 hp/atk/def 倍率；爆擊/閃避判定優先採用模板的 LUK 覆寫值，否則回退全域 `ENEMY_COMBAT_STATS`
- `app/composables/useAdventureRun.ts`／`app/pages/adventure.vue`：run 開始時顯示分級/陣營提示文案
- **明確排除**：技能/冷卻機制(`docs/worldview.md` §7.5 挑選的 8 隻帶技能敵人)不在本 change 範圍，留待未來的 `enemy-boss-skills` change
- 依賴：`single-stage-run-settlement`(已歸檔實作)——一個 run 對應一個 Stage，本 change 的分級/陣營只需在 `createRun` 骰一次，不需要章節內多 Stage 的邊界推進邏輯
