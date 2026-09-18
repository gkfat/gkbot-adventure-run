## Why

`combat-engine` 目前是純自動攻防（無技能），5 個可選職業除了初始 `attributes` 外在戰鬥中完全沒有差異化，敵人也完全沒有技能概念。同時角色的養成線只有屬性點/天賦點/武器熟練度，缺少一條「透過冒險持續蒐集、可自選配置」的主動戰鬥養成系統。這次要新增角色與敵人的技能系統：角色可蒐集技能碎片解鎖技能、透過戰鬥使用與碎片強化技能等級、依角色等級解鎖最多 3 個技能佩戴欄位；戰鬥中，已佩戴技能與敵人技能皆以「充能到時觸發」的方式自動發動，作為戰鬥自動模擬的策略深度延伸。

## What Changes

- 新增技能靜態資料：定義一套共用的技能效果分類（造成傷害-單體/AOE/濺射、凍結行動、短暫增加攻速、恢復生命、增強防禦、增加爆擊機率、降低敵人防禦，另新增「持續傷害（中毒/灼燒類）」與「護盾（吸收傷害）」兩類），5 個可選職業（`fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler`）各自對應 2~3 個呼應職業敘事的角色技能，並為部分敵人 archetype 指派對應敘事的敵人技能。
- 新增技能碎片與解鎖：角色透過冒險戰鬥掉落或商店購買取得指定技能的碎片，碎片集滿解鎖門檻即可解鎖該技能。
- 新增技能等級養成：已解鎖技能可透過戰鬥中觸發使用累積 exp 自動升級，亦可消耗該技能的碎片主動強化（一次性轉換為 exp）；等級提升增強技能效果數值，充能所需時間不隨等級變動。
- 新增技能佩戴欄位：角色初始 1 個佩戴欄位，每 7 級多開放 1 個，最多同時佩戴 3 個已解鎖技能；提供查詢/裝備/卸下技能的 API。
- `combat-engine` 的戰鬥模擬迴圈擴充：每個佩戴技能的角色與具備技能的敵人，於戰鬥開始時開始充能（充能時長依技能效果強度分級，越強效果充能越久），充能完成後於下次輪到該單位行動時觸發技能效果取代（或疊加，依效果類型）普通攻擊；`combatLog` 新增 `SKILL` 事件記錄技能發動與效果，戰鬥結算同時依本場實際觸發次數為對應技能累積 exp。
- `shop` 新增技能碎片商品：每日商店可額外生成「指定技能碎片」商品，購買後直接增加對應技能的碎片數量（不佔用永久背包格）。
- 角色頁（`inventory` 頁）新增「技能」tab：比照裝備/道具 tab 的一格一格格狀呈現，含未解鎖（碎片進度遮罩）與已解鎖（等級/exp/是否佩戴）兩種格子狀態，點擊格子開啟 dialog 顯示技能標題、描述、效果數值、碎片進度或強化操作。

## Capabilities

### New Capabilities
- `character-skills`：技能靜態資料模型（角色技能/敵人技能/技能效果分類）、技能碎片取得與解鎖、技能等級與強化、技能佩戴欄位與裝備管理 API、角色頁「技能」tab UI。

### Modified Capabilities
- `combat-engine`：戰鬥模擬迴圈新增技能充能/觸發/結算流程（含敵人技能），`CombatLogEntry` 新增 `SKILL` 事件類型，戰鬥結算新增技能 exp 累積與碎片掉落。
- `shop`：每日商店新增技能碎片商品類型與對應購買流程。

## Impact

- `server/services/combat.service.ts`：`CombatUnit` 新增充能狀態欄位，`resolve`/`performAttack` 加入技能觸發與效果結算分支（含持續傷害/護盾等跨回合狀態）。
- `server/constants/templates/`：新增角色技能靜態資料檔；`server/constants/combat.ts`（`EnemyArchetype`）新增可選技能欄位。
- `server/services/character-skill.service.ts`（新增）：技能碎片/解鎖/等級/佩戴欄位的查詢與異動邏輯。
- `server/repositories/character.repository.ts` 或角色文件 schema：新增 `skillFragments`/`unlockedSkills`/`equippedSkillIds` 等欄位。
- `shared/types/adventure.ts`、`shared/types/character.ts`：新增 `SkillEffectKind`/`CharacterSkill`/`EnemySkill`/`CombatLogEntry` 的 `SKILL` action 型別。
- `shared/schemas/api/`：新增技能查詢/解鎖/裝備/強化的 request/response schema，並在 `server/utils/openapi.ts` 註冊。
- `server/services/shop.service.ts`：每日商店生成邏輯新增技能碎片商品類型。
- `app/pages/inventory.vue`、`app/components/game/inventory/*`（新增元件）：技能 tab 格狀清單、技能 dialog、佩戴欄位管理 UI。
- 不影響現有存檔角色/run 資料結構（技能相關欄位皆為新增，非改寫既有欄位），不需要資料遷移；`CombatLogEntry.action` 新增列舉值為向後相容擴充。
