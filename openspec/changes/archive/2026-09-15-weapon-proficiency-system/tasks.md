## 1. Schema／型別

- [x] 1.1 `shared/types/common.ts` 新增 `WeaponType` enum（`FIST`/`BLADE`/`BLUNT`/`POLEARM`/`RANGED`）
- [x] 1.2 `shared/schemas/firestore/item.schema.ts` 的 `itemInstanceSchema`：新增 `weaponType`（僅武器類適用，optional）、`aoeChance`/`splashChance`（僅武器類適用，optional，預設 0）；新增 `weight`（全部 `EQUIPMENT` 類必填）；移除獨立的 `weaponWeightClass` 欄位（改為由 `weight` 推導，見 3.x）
- [x] 1.3 `server/constants/templates/items.ts` 的 `ItemTemplate` 型別同步調整（新增欄位、移除 `weaponWeightClass` 直接指定）
- [x] 1.4 `shared/schemas/firestore/character.schema.ts` 新增 `weaponProficiency: z.record(WeaponType, z.object({ exp, level }))`（`.default({})`）與 `dualWieldProficiency: z.object({ exp, level })`（`.default({ exp: 0, level: 1 })`）
- [x] 1.5 `shared/schemas/api/character.schema.ts` 角色回應 schema 新增 `weaponProficiency`/`dualWieldProficiency`
- [x] 1.6 `shared/types/character.ts` 同步新增對應 TS 型別

## 2. 武器/裝備內容資料

- [x] 2.1 為現有 9 把武器範本逐一標上 `weaponType`（FIST/BLADE/BLUNT，見 design.md 對照表）
- [x] 2.2 為現有全部 `EQUIPMENT` 範本（6 槽位皆含）逐一設定 `weight`，並移除原本寫死的 `weaponWeightClass`
- [x] 2.3 挑選現有武器中 1～2 把設定非 0 的 `aoeChance`/`splashChance` 作為初版內容
- [x] 2.4 新增至少 1～2 把 `POLEARM` 武器範本
- [x] 2.5 新增至少 2～3 把 `RANGED` 科技槍械武器範本（電磁手槍/雷射步槍等 cyberpunk 主題，見 design.md D8）

## 3. 全身負重與超重懲罰

- [x] 3.1 `server/constants/` 新增 `weight` → `WeaponWeightClass` 推導函式與區間常數（見 design.md D6）
- [x] 3.2 `item.service.ts` 的 `rollStats`/`sumEquipmentStats`/`isLightArmorTemplate` 等處，`weaponWeightClass` 讀取來源改為呼叫推導函式（輸入 `weight`），`isLightArmorTemplate` 改用 `weaponType === undefined` 判斷「是否為武器」
- [x] 3.3 新增超重固定懲罰常數表（超出量 → 懲罰項，見 design.md D6）
- [x] 3.4 `shared/utils/calculateStats.ts` 新增 `applyWeightOverloadPenalty()`，加總角色 6 槽位已裝備道具 `weight`、比較 `carryCapacity`、套用懲罰表；串接進 stats 計算管線（天賦之後、熟練度加成之後）
- [x] 3.5 補上對應單元測試（超重不擋裝備、懲罰隨超出量疊加、卸下後懲罰解除、與 HEAVY 道具自身懲罰並存，見 `specs/weapon-weight-class` 各 Scenario）
- [x] 3.6 `shared/constants/equipmentWeight.ts`：新增 `RARITY_WEIGHT_BONUS`（依 `Rarity` 的重量加成表，N/R=0、SR=+1、SSR=+2、L=+3）；`BASE_CARRY_CAPACITY` 從 20 改為 10，`CARRY_CAPACITY_PER_STAT_POINT` 維持 2（見 design.md D6b）
- [x] 3.7 `server/services/item.service.ts` 的 `generateItemInstance()`：新增依 rarity + 主屬性（`ATK`/`DEF`）roll 結果相對區間中位數計算 `ROLL_QUALITY_BONUS`（+0/+1），與 `template.weight`、`RARITY_WEIGHT_BONUS` 相加得出 instance 最終 `weight`（取代目前直接複製 `template.weight`）；`rollStats()` 內部既有用 `template.weight` 推導 `weaponWeightClass` 的用途（HEAVY 保底鍵、`isLightArmorTemplate`）維持沿用 baseline 值不變（見 design.md D6 ASSUMPTION）
- [x] 3.8 `sumEquipmentStats`/`applyWeightOverloadPenalty` 等既有「加總已裝備道具 weight」的呼叫點，確認讀的是 `ItemInstance.weight`（非 template 值）——確認已符合（`sumEquippedWeight`/`sumEquipmentStats` 皆讀 `ItemInstance.weight`），無需修正
- [x] 3.9 補上對應單元測試：同一 template 不同稀有度 instance 的 `weight` 隨稀有度遞增、主屬性 roll 品質較高時 `weight` 較重、`carryCapacity` 基準值調整後的預設值行為（`item.service.test.ts`、`server/constants/stats.test.ts`、`character.service.talents.test.ts`）

## 4. 武器熟練度計算與寫入

- [x] 4.1 `shared/utils/calculateStats.ts` 新增 `applyProficiencyStats()`，接在 `applyTalentStats` 之後、`applyWeightOverloadPenalty` 之前；內部依序套用各 `weaponType` 加成，再套用 `dualWieldProficiency` 加成（只在雙手皆為武器時）
- [x] 4.2 `character.service.ts` 的 `withStats()` 串接 `applyProficiencyStats`，讀取角色雙手中每一個帶 `weaponType` 裝備的類型與對應等級（雙持不同類型時各自疊加，同類型只計一次）＋雙手是否皆為武器（決定 `dualWieldProficiency` 加成是否生效）
- [x] 4.3 `CharacterService` 新增 `recordWeaponProficiency()`（比照 `recordEncounteredArchetypes`/`recordDefeatedArchetypes` 的寫入模式），依命中/爆擊次數更新各 `weaponType` 與（雙持時）`dualWieldProficiency` 的 exp 並重新計算 level，回傳本次「各維度（含雙持）升級前後 level」供 4.4/6.x 成就判斷使用
- [x] 4.4 `server/constants/` 集中放置 Lv.1～10 exp 門檻常數表（見 design.md D4，刻意陡峭的曲線；`weaponType` 與 `dualWieldProficiency` 共用同一份表）

## 5. 戰鬥引擎：攻擊型態與被動

- [x] 5.1 `combat.service.ts` 的 `CombatUnit` 新增 `statusEffects` 陣列（可作用於任一單位）與 `consecutiveHitCount`（玩家專用），實作套用/遞減/歸零邏輯
- [x] 5.2 `performAttack()` 改為回傳本次攻擊結果（命中/爆擊/傷害/目標），供呼叫端統計熟練度與觸發被動
- [x] 5.3 新增目標型態判定：讀取玩家雙手武器的 `aoeChance`/`splashChance` 取較高者，決定 AoE／濺射／單體，實作傷害與 `combatLog` 規則（見 `specs/weapon-attack-pattern`）
- [x] 5.4 在 `resolve()` 內累計本場戰鬥雙手武器的命中/爆擊統計（含是否雙持），結算時呼叫 `recordWeaponProficiency()`
- [x] 5.5 實作 5 個 `weaponType` 的被動效果（見 design.md D5 表格）：FIST/RANGED 的自身 buff＋連續命中計數、BLADE 的傷害計算內聯加成、BLUNT 的目標減益、POLEARM 的 AoE/濺射加成
- [x] 5.6 實作雙持專屬被動（見 design.md D5「雙持被動」表）：命中時機率觸發追加攻擊、雙持時 aoeChance/splashChance 額外加成

## 6. 成就

- [x] 6.1 `shared/types/quest.ts` 的 `AchievementType` 新增 `WEAPON_PROFICIENCY_LEVEL`（PEAK/GTE）、`WEAPON_TYPES_MASTERED`（CUMULATIVE）、以及 6 個 `WEAPON_MASTERY_<TYPE>`（`FIST`/`BLADE`/`BLUNT`/`POLEARM`/`RANGED`/`DUAL_WIELD`，皆 PEAK/GTE）
- [x] 6.2 `server/constants/templates/achievement.ts` 新增 7 個成就範本：`weapon_apprentice`（任一類型 Lv.5）、`fist_mastery`/`blade_mastery`/`blunt_mastery`/`polearm_mastery`/`ranged_mastery`/`dual_wield_mastery`（各自 Lv.10）、`pentagonal_mastery`（集滿 5 類 Lv.10）（見 design.md D9 對照表）
- [x] 6.3 `server/services/progress-tracker.service.ts` 的 `ACHIEVEMENT_EVENT_TYPE` 新增 `WEAPON_LEVEL_REACHED -> WEAPON_PROFICIENCY_LEVEL`（不含雙持）、6 個 `WEAPON_LEVEL_REACHED_<TYPE> -> WEAPON_MASTERY_<TYPE>`（含 `_DUAL_WIELD`）、`WEAPON_TYPE_MASTERED -> WEAPON_TYPES_MASTERED`（不含雙持）事件對應
- [x] 6.4 `combat.service.ts` 的 `resolve()` 依 4.3 回傳的升級資訊：每個實際升級的 `weaponType` 觸發 `WEAPON_LEVEL_REACHED` + 對應 `WEAPON_LEVEL_REACHED_<TYPE>`；`dualWieldProficiency` 升級時只觸發 `WEAPON_LEVEL_REACHED_DUAL_WIELD`；每個 `weaponType`（不含雙持）首次跨過 Lv.10 額外觸發 `WEAPON_TYPE_MASTERED`

## 7. 測試

- [x] 7.1 `combat.service.test.ts` 新增：AoE 命中全部敵人、濺射命中主+2 目標並打折、雙持取較高機率、熟練度 exp 累積（一般/爆擊/被閃避/雙持各自累積、雙持額外累積 `dualWieldProficiency`）、雙手皆無武器不累積、5 類＋雙持被動觸發、升級/Mastery 觸發對應成就事件
- [x] 7.2 `item.service.test.ts` 新增：`weight` → `weaponWeightClass` 推導、`isLightArmorTemplate` 改用 `weaponType` 判斷後的行為不變
- [x] 7.3 `character.service.test.ts` 新增熟練度加成套用（單持/雙持不同類型/雙持同類型/雙持加成只在雙手皆武器時生效）、超重懲罰套用/解除
- [x] 7.4 `achievement.service.test.ts`／`progress-tracker.service.test.ts` 新增新成就類型（含 6 個獨立 Mastery 成就）的達成/領取流程
- [x] 7.5 `pnpm lint` / `pnpm vitest run` / `pnpm build` 全數通過

## 8. 前端：角色頁改版

- [x] 8.1 `app/components/game/character-stage/characterStage.vue`：移除 `GameCharacterStageAttributePanel`/`GameCharacterStageCombatStats` 的掛載與其屬性點分配互動邏輯（`allocating`/`pendingAllocation` 等），保留裝備欄位/角色圖像/CTA
- [x] 8.2 `app/pages/inventory.vue`：頂部依序新增 `AttributePanel`（從 8.1 搬過來）、`CombatStats`（同上）、新的武器熟練度面板；既有裝備總覽區塊新增「目前重量／`carryCapacity`」文字，超重時套用警示樣式
- [x] 8.3 新增武器熟練度面板元件（6 條進度：5 個 `weaponType` + `dualWieldProficiency`，各自等級/進度條/已解鎖被動清單；未使用過的類型顯示空狀態，未解鎖等級不提前顯示被動內容）
- [x] 8.4 `app/components/game/layouts/bottomNav.vue`：`inventory` 項目 label 由「背包」改回「角色」（icon 視覺可沿用或依需要調整）
- [x] 8.5 `app/components/game/common/itemDetailDialog.vue`：新增 `weight` 顯示（全部 `EQUIPMENT`）與 `weaponType` 標籤（武器類額外顯示）
- [x] 8.6 `server/utils/openapi.ts` 註冊角色回應新增的 `weaponProficiency`/`dualWieldProficiency` 欄位

## 9. 前端：戰鬥演出傷害飄字調整

- [x] 9.1 `app/composables/useCombat.ts`：把單一 `DAMAGE_TEXT_FX_MS = 700` 拆成 `DAMAGE_TEXT_FX_MS_NORMAL = 1500`（ATTACK）與 `DAMAGE_TEXT_FX_MS_CRIT = 2000`（CRIT），`DODGE` 沿用原始 700ms；`damageTextFx` 觸發時依事件 `action` 選對應時長設定 `setTimeout`
- [x] 9.2 `app/components/game/adventure/combatResultPanel.vue`：`combat-result-panel-damage-text-float` 動畫拆成一般/爆擊兩個 duration（或改用 CSS variable 控制），確保與 9.1 的計時器對齊；`__damage-text--crit` font-size 18px → 22px，`__damage-text-crit-label` font-size 10px → 13px
- [ ] 9.3 實機測試 AoE/濺射觸發時，同一波短時間內多筆飄字是否互相重疊蓋住畫面；若太擠，調整飄字堆疊位移量，不縮短時長
- [x] 9.4 `pnpm lint` 確認樣式/腳本改動無違規
