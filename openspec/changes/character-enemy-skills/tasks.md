## 1. 型別與資料模型

- [ ] 1.1 於 `shared/types/adventure.ts` 新增 `SkillEffectKind`/`SkillEffect`/`CharacterSkill`/`EnemySkill` 型別，`CombatLogEntry.action` 加入 `'SKILL'`，`CombatLogEntry` 新增可選 `skillId`/`skillName` 欄位
- [ ] 1.2 於 `server/constants/combat.ts` 的 `EnemyArchetype` 型別新增可選欄位 `skill?: EnemySkill`

## 2. 角色技能靜態資料

- [ ] 2.1 新增 `server/constants/templates/characterSkills.ts`：`CHARACTER_SKILLS`（5 個可選職業各一筆，依 design.md 表格的 skillId/effect）、`getCharacterSkillByArchetypeId()`
- [ ] 2.2 於 `server/constants/templates/index.ts` re-export `characterSkills.ts`
- [ ] 2.3 新增 `server/constants/templates/characterSkills.test.ts`：驗證 5 個可選職業各查得唯一一筆技能、退役職業查無資料

## 3. 敵人技能範例資料

- [ ] 3.1 挑選 1~2 個既有 `ENEMY_ARCHETYPES`/`HUMAN_ARCHETYPES` 範本，填入 `skill` 欄位（依 design.md 選定的效果種類）
- [ ] 3.2 確認其餘敵人範本 `skill` 維持未定義，不影響既有 `combat.test.ts` 測試案例使用的範本

## 4. 戰鬥引擎：資源值與技能觸發

- [ ] 4.1 `CombatUnit` 型別新增 `energy: number` 與 `skill?: CharacterSkill | EnemySkill`
- [ ] 4.2 建立玩家 `CombatUnit` 時，依 `character.archetypeId` 查 `getCharacterSkillByArchetypeId()` 帶入 `skill`，`energy` 初始為 0
- [ ] 4.3 `buildEnemyUnit` 依 `archetype.skill` 帶入敵人 `CombatUnit.skill`，`energy` 初始為 0
- [ ] 4.4 每完成一次普通攻擊行動（`performAttack` 呼叫後）為 `actor.energy` 增加固定量（`ENERGY_PER_ACTION` 常數）
- [ ] 4.5 於行動排程選出 `actor` 後，判斷 `actor.skill && actor.energy >= actor.skill.energyThreshold` 時改走技能結算分支，否則維持現有 `performAttack`
- [ ] 4.6 技能結算分支：依 `SkillEffect.kind` 分派 `BONUS_DAMAGE`（套用既有 dodge/crit/`computeDamage` 後乘 `multiplier`）/`HEAL_SELF`（回復 `hpMax * percent`，clamp 不超過 `hpMax`）/`DEBUFF_TARGET_DEF`（直接調整目標 `CombatUnit.def`，僅本場模擬記憶體生效），觸發後 `energy -= energyThreshold`（不歸零）
- [ ] 4.7 技能結算分支寫入一筆 `action = 'SKILL'` 的 `combatLog` 事件（含 `skillId`/`skillName`，傷害/自療結果沿用 `damage`/`targetHpRemaining`/`targetId` 欄位，`HEAL_SELF` 的 `targetId` 等於 `actorId`）
- [ ] 4.8 `wave` 交界重置：確認 `DEBUFF_TARGET_DEF` 等臨時狀態的作用範圍與現有 `player.nextAttackAt = 0` 的 wave 重置邏輯一致（比照 RunModifier 只在模擬記憶體內生效的既有原則，說明是否需要在新 wave 重置或維持整場戰鬥）

## 5. 前端播放

- [ ] 5.1 檢查 `app/components/game` 內解析 `combatLog.action` 的播放元件，新增 `SKILL` 事件的顯示分支（技能名稱 + 效果摘要文案）
- [ ] 5.2 確認敵人狀態面板／玩家 HP 顯示能正確反映 `SKILL` 事件的 `targetHpRemaining`（含 `HEAL_SELF` 治療後的數值上升）

## 6. 測試與驗證

- [ ] 6.1 `server/services/combat.service.test.ts` 新增測試：具備技能的單位在 `energy` 達門檻時觸發 `SKILL` 事件而非普通攻擊
- [ ] 6.2 新增測試：`energy` 未達門檻時維持既有 `ATTACK`/`CRIT`/`DODGE` 行為不變
- [ ] 6.3 新增測試：`BONUS_DAMAGE`/`HEAL_SELF`/`DEBUFF_TARGET_DEF` 三種效果的結算結果符合預期（含 `HEAL_SELF` 不超過 `hpMax` 的 clamp）
- [ ] 6.4 新增測試：未設定 `skill` 的既有敵人範本戰鬥行為與變更前一致（回歸測試）
- [ ] 6.5 執行 `pnpm lint`、`pnpm test`、`pnpm build` 全數通過

## 7. 文件同步

- [ ] 7.1 視需要更新 `docs/game-design/mechanics/combat.md`，補充技能/資源值機制說明
- [ ] 7.2 確認本次 tasks 不涉及其他 capability 的 spec 異動，`opsx:sync` 時只同步 `character-enemy-skills`/`combat-engine` 兩份 delta spec
