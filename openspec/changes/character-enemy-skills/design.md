## Context

`combat-engine`（`server/services/combat.service.ts`）目前是純自動攻防：一場戰鬥用 discrete-event schedule（每個 `CombatUnit.nextAttackAt`）決定行動順序，每次行動只會呼叫 `performAttack`（dodge roll → crit roll → `computeDamage` → 寫入一筆 `CombatLogEntry`），完全沒有「技能」或任何非普通攻擊的行動分支。`CombatLogEntry.action` 目前只有 `'ATTACK' | 'CRIT' | 'DODGE' | 'DEATH'` 四種。

5 個可選職業（`fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler`）目前除了初始 `attributes` 不同外，在戰鬥中完全沒有差異化機制，因此本次設計一組專屬戰鬥的 `CharacterSkill`，以 `archetypeId` 對應既有職業，讓每個職業在戰鬥模擬中都有一個呼應其定位敘事的主動技能。

敵人端（`EnemyArchetype`，`server/constants/combat.ts`）目前也完全沒有技能欄位，只有 `baseAtk/baseDef/baseHp/actionIntervalSec/canReinforce/critChanceOverride/dodgeChanceOverride`。

## Goals / Non-Goals

**Goals:**
- 定義一套可同時給角色與敵人使用的技能資料模型，並在 `combat-engine` 的模擬迴圈中加入「資源值累積 → 門檻觸發 → 技能結算」的流程，取代該次行動的普通攻擊。
- 為 5 個可選職業各提供 1 個 `CharacterSkill`（呼應其職業的定位敘事），驗證整條資料流可用。
- 為敵人提供 1~2 個範例 `EnemySkill`，驗證敵人也能走同一套觸發/結算流程。
- `combatLog` 新增 `SKILL` 事件，讓冒險畫面能重播技能發動與效果。
- 保持向後相容：沒有技能的敵人（絕大多數既有 `EnemyArchetype`）行為與現在完全一致。

**Non-Goals:**
- 不實作職業相關的非戰鬥效果（events/items/adventure-run 節點）——那些留給各自的消費端 change。
- 不做技能升級、技能點數分配、玩家自選技能等養成系統（本次技能是職業/敵人範本固定攜帶，非玩家可配置）。
- 不做多技能/技能欄位（每個角色職業與每隻怪物範本最多 1 個技能）。
- 不做技能的視覺特效/專屬動畫，冒險畫面僅新增文字化的 `SKILL` 事件顯示，沿用既有逐批播放機制。
- 不修改玩家可操作性——戰鬥仍是全自動模擬，技能由資源值自動觸發，非玩家手動施放。

## Decisions

### 1. 資源值命名與型別：`energy`（0~100），伺服器內部欄位，非玩家可見的養成數值
- 每個 `CombatUnit`（玩家與敵人）新增 `energy: number`（0~100）與可選 `skill?: ResolvedSkill`（見下方 2）。
- 命名採中性的 `energy`（能量）而非「怒氣」，因為敵人與玩家共用同一機制，「怒氣」語意偏向被動承受傷害，但本設計選擇「主動行動即累積」（見決策 2），中性命名更貼切。
- 型別放在 `server/services/combat.service.ts` 內部（`CombatUnit` 是該檔案的私有型別，不對外匯出），不進 `shared/types`。

**替代方案考量**：曾考慮用「受到傷害累積」（傳統仇恨/怒氣模型），但目前 `performAttack` 的傷害計算與事件記錄都以「攻擊方視角」為主，若改成「受擊累積」，被攻擊方在自己還沒行動前就要被動記錄，需要額外在 `performAttack` 內對 target 也做一次累積寫入，邏輯上更分散；選擇「每次自己完成一次普通攻擊行動即 +N energy」與現有 `actor.nextAttackAt += actor.actionIntervalSec * 1000` 的行動完成點自然對齊，改動面更小。

### 2. 觸發時機：行動完成後累積，下一次輪到自己行動時檢查是否達門檻
- 在 `performAttack` 完成一次普通攻擊後（無論命中或被閃避），呼叫方為 `actor` 增加 `energy += ENERGY_PER_ACTION`（技能定義可覆寫每次獲得量，預設一致）。
- 每次輪到某單位行動（discrete-event schedule 選出 `actor`）時，若 `actor.skill` 存在且 `actor.energy >= actor.skill.energyThreshold`，則本次行動改為「技能行動」而非 `performAttack`：扣除 `energyThreshold`（不歸零，允許溢出量留到下次），依技能 `effect` 結算，寫入一筆 `SKILL` combatLog。否則走原本 `performAttack` 路徑。
- 技能行動仍然消耗 `actor.nextAttackAt += actor.actionIntervalSec * 1000`（與普通攻擊共用同一個行動間隔，不額外設計技能專屬的施放耗時），維持現有 discrete-event schedule 不變。

**替代方案考量**：曾考慮「技能觸發後立即插入行動」（不等到該單位下次輪到），但這會打亂現有以 `nextAttackAt` 最小值決定行動順序的排程邏輯，且需要額外處理「同一輪多次行動」的 combatLog timestamp 語意（目前前端逐批播放依賴 timestamp 差值排時間軸）；選擇「維持原排程，只改變某次既定行動的行為」改動最小、與既有 `combat-log-sequential-playback` 前端邏輯完全相容。

### 3. `CharacterSkill` 與 `EnemySkill`：共用 `SkillEffect` 型別，各自獨立的技能定義型別
```ts
// shared/types/adventure.ts（新增）
export type SkillEffectKind = 'BONUS_DAMAGE' | 'HEAL_SELF' | 'DEBUFF_TARGET_DEF';

export type SkillEffect = {
  kind: SkillEffectKind;
  // BONUS_DAMAGE: 本次攻擊傷害額外乘上 multiplier；HEAL_SELF: 回復 hpMax 的 percent%；
  // DEBUFF_TARGET_DEF: 目標 DEF 降低 percent%，效果持續至戰鬥結束（同 wave 內，wave 交界重置，比照現有 RunModifier 只作用於計算期的原則）
  multiplier?: number;
  percent?: number;
};

export type CharacterSkill = {
  archetypeId: string;    // 對應 characterArchetypes.ts 的 archetypeId（僅可選職業）
  skillId: string;
  name: string;
  description: string;
  energyThreshold: number;
  effect: SkillEffect;
};

export type EnemySkill = {
  skillId: string;
  name: string;
  energyThreshold: number;
  effect: SkillEffect;
};
```
- `CharacterSkill`/`EnemySkill` 分開定義（採用者已確認），因為敵人技能未來擴充方向（debuff/群體效果）與角色技能（呼應職業敘事）語意不同，共用型別會迫使其中一方遷就對方的欄位；兩者都收斂到共用的 `SkillEffect`，避免傷害/效果計算邏輯重複。
- `SkillEffect` 只列出本次 3 種範例效果種類（`BONUS_DAMAGE`/`HEAL_SELF`/`DEBUFF_TARGET_DEF`），足以覆蓋 5 個角色技能 + 1~2 個敵人技能範例；新增效果種類是未來 change 的擴充點，本次不做成外掛式 plugin 架構（YAGNI）。

### 4. 資料檔位置
- `server/constants/templates/characterSkills.ts`：`CHARACTER_SKILLS: Record<string, CharacterSkill>`（key 為 `archetypeId`），`getCharacterSkillByArchetypeId()`。放在 `templates/` 目錄下、由 `templates/index.ts` re-export，與其他角色/道具靜態資料維持同一慣例。
- `server/constants/combat.ts`：`EnemyArchetype` 新增可選欄位 `skill?: EnemySkill`；只有範例用的 1~2 個敵人範本填值，其餘維持 `undefined`。`EnemySkill` 型別與 `SkillEffect` 一併從 `shared/types/adventure.ts` import。

### 5. 5 個角色技能的具體設計（呼應各職業的定位敘事，效果為本次獨立設計）
| archetypeId | skillId | 效果 | 呼應敘事 |
|---|---|---|---|
| fighter | adaptive_strike | BONUS_DAMAGE ×1.5 | 戰士的身體素質 → 蓄力後的強化攻擊 |
| adventurer | second_wind | HEAL_SELF 15% | 冒險家的隨機應變 → 戰鬥中的自我恢復 |
| scholar | weak_point_analysis | DEBUFF_TARGET_DEF 20% | 學者的觀察分析 → 找出弱點降低敵方防禦 |
| tinkerer | overclock | BONUS_DAMAGE ×1.3 | 工匠的超頻改裝 → 短暫過載輸出 |
| gambler | all_in | BONUS_DAMAGE ×2.0（無其他保底） | 投機者的孤注一擲 → 高倍率、無下限保護 |

`energyThreshold` 全部先取一致預設值（例如 60，`ENERGY_PER_ACTION` 預設 20，約 3 次普通攻擊觸發一次），具體數值於 tasks 實作時依 `combat.test.ts` 既有測試風格做基本合理性檢查，非本設計文件的定案重點。

### 6. `combatLog` 新增 `SKILL` 事件
```ts
// CombatLogEntry.action 擴充
action: 'ATTACK' | 'CRIT' | 'DODGE' | 'DEATH' | 'SKILL';
```
`SKILL` 事件沿用既有 `damage`/`targetHpRemaining` 欄位表達傷害類效果，新增可選欄位 `skillId`/`skillName` 供前端顯示技能名稱；`HEAL_SELF` 類效果的 `targetId` 等於 `actorId`（自我治療），`damage` 欄位不填。

### 7. 冒險畫面播放
`SKILL` 事件比照現有 `ATTACK`/`CRIT` 的 timestamp 排批邏輯自然併入既有播放序列（不需要新的排程機制），只需在渲染事件文案時新增 `SKILL` 分支（顯示技能名稱 + 效果摘要）。敵人狀態面板顯示的 HP 已由既有 `targetHpRemaining` 欄位驅動，`HEAL_SELF` 效果沿用同一欄位即可反映治療後的 HP。

## Risks / Trade-offs

- **[風險] 技能觸發稀釋一般戰鬥的可預期強度曲線** → `energyThreshold`/`ENERGY_PER_ACTION` 先取保守值（約 3 次攻擊觸發一次），且僅 5 個角色技能 + 1~2 個敵人技能範例，範圍受控；後續數值調整可透過 `known-issue.md`/`docs/game-design/balance` 追蹤，不阻塞本次 change。
- **[風險] `DEBUFF_TARGET_DEF` 需要在 `CombatUnit` 上疊加臨時狀態，可能與既有 `RunModifier`（Blessing/Curse）的套用時機衝突** → 比照 `RunModifier` 的既有原則（只影響計算期臨時數值，不寫回角色文件），在 `CombatUnit` 上直接修改該筆模擬記憶體中的 `def` 數值，戰鬥結束即隨整個 `CombatUnit` 物件捨棄，不需要額外的模仿/還原機制。
- **[風險] 敵人技能範例可能讓既有 `combat.test.ts`/`combat.service.test.ts` 的既有測試（假設純攻防）產生非預期分支** → 只在新增的 1~2 個敵人範本填 `skill` 欄位，其餘既有範本不動，既有測試案例使用的敵人範本不受影響。
- **[取捨] 角色/敵人技能目前是「職業/怪物範本固定攜帶」而非玩家可配置** → 符合本次「基礎骨架 + 少量範例」的範圍決策，避免同時處理養成/UI 選擇的額外複雜度；如需玩家自選技能，留待後續 change。

## Migration Plan

純新增欄位/新增資料，不需要資料遷移：
- `EnemyArchetype.skill` 為新增可選欄位，既有敵人範本不需要回填。
- `CombatUnit.energy`/`skill` 為 `combat.service.ts` 內部模擬狀態，每次 `resolve()` 呼叫時從頭建構，不涉及 Firestore 既有 run 文件的欄位變動，不需要 `Migration Plan` 的相容 fallback（不像 `factionType`/`severityTier` 那類需要 `?? default` 的既有欄位遷移）。
- `CombatLogEntry.action` 新增列舉值屬於向後相容擴充（既有前端邏輯若對未知 action 值有 fallback 處理則不受影響；需確認 `app/components/game` 播放元件目前對 `action` 的處理方式在 tasks 階段一併檢查）。

## Open Questions

- `energyThreshold`/`ENERGY_PER_ACTION` 的實際平衡數值待 tasks 階段參考 `docs/game-design/balance` 現有曲線微調，本設計只定案機制與資料形狀。
- 敵人範例技能要放在哪 1~2 個既有敵人範本（`ENEMY_ARCHETYPES`/`HUMAN_ARCHETYPES` 或 Boss 清單）尚未挑選，將於 tasks 階段依現有範本描述挑選語意合適者。
