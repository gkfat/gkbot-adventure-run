## 1. 資料層：型別與台詞資料表

- [ ] 1.1 在 `app/constants/dialogueLines.ts` 新增 `DialogueTrigger` union type（`ENCOUNTER`/`ATTACK`/`CRIT`/`HIT_TAKEN`/`DODGE`/`DEFEATED`/`VICTORY`/`HEAL`/`BLESSING`/`CURSE`/`WHEEL`/`CHOICE`）與 `DialogueLineSet` type
- [ ] 1.2 建立 `GENERIC_PLAYER_LINES`（通用玩家台詞池）與 5 個 `PLAYER_DIALOGUE_LINES`（依 `fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler` 的 `archetypeId`）初版台詞內容
- [ ] 1.3 建立 `GENERIC_ENEMY_LINES_BY_FACTION`（`HUMAN`/`GKBOT` 兩個陣營通用池）初版台詞內容
- [ ] 1.4 為至少各陣營的 boss archetype（`GKBOT_BOSS_ARCHETYPES`/`HUMAN_BOSS_ARCHETYPES`，以 `slug` 為 key）撰寫專屬台詞，一般小兵 archetype 先 fallback 至陣營通用池
- [ ] 1.5 新增 `resolveDialogueLines(subjectKind, archetypeKey, trigger)` 查找函式：專屬台詞 → 陣營/身份通用池 → 皆無則回傳空陣列

## 2. 邏輯層：挑選與防重複 composable

- [ ] 2.1 新增 `app/composables/useDialogueBubble.ts`：`bubbles: reactive<Map<subjectId, { text: string; key: number }>>` 狀態
- [ ] 2.2 實作隨機挑選 + 同主體同 trigger 防連續重複邏輯（`lastLineIndex: Map<string, number>`）
- [ ] 2.3 實作 `triggerDialogue(subjectId, trigger, archetypeKey, subjectKind)`：查無台詞時不寫入 state（不顯示氣泡）
- [ ] 2.4 實作固定顯示時長（2.4s）自動清除，沿用 `Map.set + setTimeout` pattern；新觸發直接覆蓋同 subjectId 既有項目並重設計時器
- [ ] 2.5 實作 `ATTACK` 觸發的顯示機率節流（初始 35%），其餘 trigger 一律必顯示
- [ ] 2.6 撰寫 `useDialogueBubble.ts` 的單元測試（挑選/防重複/機率節流/查無台詞不顯示）——若專案前端尚無既有 test 慣例可套用，改以手動驗證並在 PR 說明中記錄驗證步驟

## 3. UI 元件

- [ ] 3.1 新增 `app/components/game/adventure/dialogueBubble.vue`：`props: { text: string | null }`，絕對定位 + 氣泡尾巴樣式 + 進出場 CSS animation（比照 `sparkFx.vue` 的視覺風格與 `font-pixel`）
- [ ] 3.2 定義氣泡 `max-width` 與允許換行的樣式，避免在敵人卡片較窄時溢出或遮住 HP/行動條

## 4. 整合：戰鬥演出

- [ ] 4.1 在 `app/composables/useCombat.ts` 的 `fireEntry()` 內，對 `ATTACK`/`CRIT` entry 呼叫 `triggerDialogue(actorId, trigger, ...)`（攻擊方）與 `triggerDialogue(targetId, 'HIT_TAKEN', ...)`（受擊方，各自獨立判斷是否顯示）
- [ ] 4.2 對 `DODGE` entry 呼叫 `triggerDialogue(targetId, 'DODGE', ...)`
- [ ] 4.3 將 `DEATH` entry 的既有 `continue` 邏輯改為：先呼叫 `triggerDialogue(targetId, 'DEFEATED', ...)`，再 `continue`（不觸發其餘視覺 fx）
- [ ] 4.4 在戰鬥揭曉勝利的時間點（`playbackDone` 為真且 `victory === true`）觸發玩家 `VICTORY` 對話
- [ ] 4.5 在敵人預覽（`EnemyPreview`）顯示的畫面位置，對進場的敵人觸發 `ENCOUNTER` 對話
- [ ] 4.6 在 `characterStage.vue` 的 `.character-stage__sprite-wrap` 內掛載 `<GameAdventureDialogueBubble>`（玩家專用，`subjectId = 'player'`）
- [ ] 4.7 在 `combatResultPanel.vue` 的 `.combat-result-panel__fx-anchor` 內掛載 `<GameAdventureDialogueBubble>`（逐張敵人卡片，`subjectId = enemy.enemyId`）

## 5. 整合：事件結算

- [ ] 5.1 確認 `eventResultDialog.vue` 開啟期間 `characterStage.vue`（含其 sprite-wrap）的可視狀態；若被 dialog 完全遮蔽，改為在 `eventResultDialog.vue` 內新增行內對話呈現位置（沿用同一份 `useDialogueBubble` 邏輯與台詞資料，僅渲染位置不同）
- [ ] 5.2 依 `EventResult.type` 與是否有對應結果欄位（`hpHealed`/`blessingGranted`/`curseApplied`/`WHEEL`/`CHOICE`），在事件結算流程觸發玩家對應 trigger 的對話氣泡

## 6. 驗證

- [ ] 6.1 `pnpm lint` 通過
- [ ] 6.2 `pnpm build` 通過（型別檢查）
- [ ] 6.3 於瀏覽器實際跑一場完整戰鬥（含多波次、爆擊、閃避、擊敗敵人、玩家勝利）與至少一次各類型 EVENT 節點，確認氣泡顯示時機、內容、防重複與淡出行為符合預期，且未阻塞既有演出時間軸
- [ ] 6.4 確認高頻連續攻擊情境下（多敵人同時出手）氣泡顯示頻率不過度雜亂，必要時調整 `ATTACK` 顯示機率
