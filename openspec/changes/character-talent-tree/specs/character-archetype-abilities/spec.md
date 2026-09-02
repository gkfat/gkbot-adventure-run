## REMOVED Requirements

### Requirement: 每個可選職業定義一個核心特色機制
**Reason**: `ArchetypeAbility`/`ArchetypeAbilityTrigger` 自訂案以來從未有任何消費端串接數值運算，本次改用 `character-talents` capability 的職業天賦樹作為職業差異化機制的正式落地方案，取代原本只做為靜態查表用途的 `ArchetypeAbilityTrigger`。
**Migration**: 無資料遷移需求——`ArchetypeAbility` 靜態資料未被寫入任何 Firestore 文件、未被任何程式碼消費，直接刪除 `server/constants/templates/archetypeAbilities.ts` 與其測試檔即可；玩家既有角色資料不受影響。
