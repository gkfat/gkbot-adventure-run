## 1. 資料層：型別與台詞資料表

- [x] 1.1 在 `app/constants/dialogueLines.ts` 新增 `DialogueTrigger` union type（`ENCOUNTER`/`ATTACK`/`CRIT`/`HIT_TAKEN`/`DODGE`/`DEFEATED`/`VICTORY`/`HEAL`/`BLESSING`/`CURSE`/`WHEEL`/`CHOICE`）與 `DialogueLineSet` type
- [x] 1.2 建立 `GENERIC_PLAYER_LINES`（通用玩家台詞池）與 5 個 `PLAYER_DIALOGUE_LINES`（依 `fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler` 的 `archetypeId`）初版台詞內容
- [x] 1.3 建立 `GENERIC_ENEMY_LINES_BY_FACTION`（`HUMAN`/`GKBOT` 兩個陣營通用池）初版台詞內容
- [x] 1.4 為各陣營的 boss archetype（`GKBOT_BOSS_ARCHETYPES`/`HUMAN_BOSS_ARCHETYPES` 全部 16 個，以 `slug` 為 key）撰寫專屬台詞，一般小兵 archetype fallback 至陣營通用池
- [x] 1.5 新增 `resolveDialogueLines(subject, trigger)` 查找函式：專屬台詞 → 陣營/身份通用池 → 皆無則回傳空陣列

## 2. 邏輯層：挑選與防重複 composable

- [x] 2.1 新增 `app/composables/useDialogueBubble.ts`：`bubbles: reactive<Map<subjectId, { text: string; key: number }>>` 狀態（module-level 單例，比照 `useCharacter.ts`/`useAdventureRun.ts` 的既有慣例，供 `useCombat.ts`／`adventure.vue`／事件結果 dialog 們共用同一份狀態）
- [x] 2.2 實作隨機挑選 + 同主體同 trigger 防連續重複邏輯（`lastLineIndex: Map<string, number>`）
- [x] 2.3 實作 `triggerDialogue(subjectId, trigger, subject)`：查無台詞時不寫入 state（不顯示氣泡）
- [x] 2.4 實作固定顯示時長（2.4s）自動清除，沿用 `Map.set + setTimeout` pattern；新觸發直接覆蓋同 subjectId 既有項目並重設計時器
- [x] 2.5 實作 `ATTACK` 觸發的顯示機率節流（35%），其餘 trigger 一律必顯示（依 spec.md 為準——HIT_TAKEN/DODGE 亦不節流）
- [x] 2.6 撰寫 `useDialogueBubble.test.ts` 單元測試（挑選/防重複/機率節流/查無台詞不顯示/計時器覆蓋），沿用 `useCombat.test.ts` 已建立的 Nuxt auto-import stub 慣例，`vitest.config.ts` 本來就涵蓋 `app/**/*.test.ts`

## 3. UI 元件

- [x] 3.1 新增 `app/components/game/adventure/dialogueBubble.vue`：`props: { text: string | null }`，絕對定位 + 氣泡尾巴樣式 + 進出場 CSS animation（比照 `sparkFx.vue` 的視覺風格與 `font-pixel`）；呼叫端在標籤本身綁 `:key`（比照 `sparkFx.vue`）觸發重播
- [x] 3.2 定義氣泡 `max-width` 與允許換行的樣式，避免在敵人卡片較窄時溢出或遮住 HP/行動條

## 4. 整合：戰鬥演出

- [x] 4.1 在 `app/composables/useCombat.ts` 的 `fireEntry()` 內，對 `ATTACK`/`CRIT` entry 呼叫 `fireDialogue(actorId, trigger)`（攻擊方）與 `fireDialogue(targetId, 'HIT_TAKEN')`（受擊方，各自獨立判斷是否顯示）
- [x] 4.2 對 `DODGE` entry 呼叫 `fireDialogue(targetId, 'DODGE')`
- [x] 4.3 將 `DEATH` entry 的既有 `continue` 邏輯改為：先呼叫 `fireDialogue(targetId, 'DEFEATED')`，再 `continue`（不觸發其餘視覺 fx）
- [x] 4.4 在戰鬥揭曉勝利的時間點（`playbackDone` 為真且 `victory === true`）觸發玩家 `VICTORY` 對話
- [x] 4.5 【調整】原計畫「敵人預覽（EnemyPreview）畫面」目前已不再另外列出敵人清單（見 `adventure.vue` 現有註解：banner 結束後直接開戰，不顯示名單），故改為在每個 wave（含後續增援）的敵人卡片第一次進場（`waveDisplay` 轉為 `entering`）那一刻，對該 wave 每隻敵人觸發 `ENCOUNTER`——玩家實際看到敵人的那一刻觸發，效果等價
- [x] 4.6 【調整】原計畫掛載於 `characterStage.vue` 的 `.character-stage__sprite-wrap`；實測發現該元件只用於 `main.vue`（角色管理首頁），冒險/戰鬥畫面的玩家 stage 其實是 `adventure.vue` 自己內建的 `.adventure-page__stage-fx-anchor`（`useCombat()` 也是直接在 `adventure.vue` 呼叫，不在 `characterStage.vue` 內）。故改為掛載於 `adventure.vue` 的 `.adventure-page__stage-fx-anchor`，`subjectId = 'player'`
- [x] 4.7 在 `combatResultPanel.vue` 的 `.combat-result-panel__fx-anchor` 內掛載 `<GameAdventureDialogueBubble>`（逐張敵人卡片，`subjectId = enemy.enemyId`）

## 5. 整合：事件結算

- [x] 5.1 瀏覽器實測：`eventResultDialog.vue`／`modifierAcquiredDialog.vue`（獲得祝福/詛咒）／`wheelResultDialog.vue`（轉盤）三個結果 dialog 都是置中的 `v-dialog`，會不同程度地遮蔽玩家 stage 上的氣泡（獲得祝福時幾乎全遮）。三者皆已加上同一份行內對話呈現（沿用 `useDialogueBubble` 的 `bubbles.get('player')`），確保不論遮蔽程度都看得到
- [x] 5.2 依 `EventResult.type`（`HEAL`/`BLESSING`/`CURSE`/`WHEEL`/`CHOICE` 與 `DialogueTrigger` 同名，直接轉型使用）在 `handleResolveEvent()` 內觸發玩家對應 trigger 的對話氣泡

## 6. 驗證

- [x] 6.1 `pnpm lint` 通過（僅剩與本次改動無關的既有 pre-existing lint 錯誤，已確認新增/修改的檔案本身零錯誤）
- [x] 6.2 `pnpm build` 通過（型別檢查、production build 皆成功）
- [x] 6.3 於瀏覽器實際跑一場完整戰鬥（含多波次、Boss 戰＋兩隻小兵、爆擊、閃避、擊敗敵人、玩家勝利）與 BLESSING 事件節點，透過 DOM MutationObserver／`Map.prototype.set` 埋樁確認：ENCOUNTER（boss+小兵進場）、ATTACK（含 fighter 專屬台詞「受死！」）、HIT_TAKEN（含「這點傷不算什麼！」/「有點兩下子嘛。」）、DEFEATED、VICTORY（「哼，不過如此。」）、BLESSING 皆正確觸發、正確 fallback、且未阻塞既有演出時間軸；HEAL/CURSE/WHEEL/CHOICE 邏輯與 BLESSING 走同一段程式碼路徑（`triggerPlayerEventDialogue`），未逐一實機觸發但程式路徑一致
- [x] 6.4 本次實測（單一 wave 3 敵人同時出手的 Boss 戰）氣泡未出現過度雜亂的情形，`ATTACK` 35% 維持初始值即可，未調整

## 過程中發現並修正的問題（非原 tasks 清單項目）

- `wheelResultDialog.vue` 本身並未依賴 Nuxt 自動 import（明確 `import { ref, watch } from 'vue'`），新增的 `computed` 呼叫需一併明確 import，否則 build 會失敗——已修正。
