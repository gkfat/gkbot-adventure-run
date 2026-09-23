## 1. BGM 切換

- [x] 1.1 `app/layouts/game.vue`：新增 `watch(isAdventurePage, ..., { immediate: true })`，`isAdventurePage` 為 `true` 時 `playBgm('adventure.mp3')`，否則 `playBgm('town.mp3')`
- [x] 1.2 `app/layouts/game.vue`：新增 `onUnmounted(() => stopBgm())`

## 2. 裝備與購買 SFX

- [x] 2.1 `app/components/game/common/itemDetailDialog.vue` 的 `handleEquip`：`success` 為 `true` 分支內播放 `sfx/equip.mp3`
- [x] 2.2 `app/components/game/common/itemDetailDialog.vue` 的 `handleUnequip`：`success` 為 `true` 分支內播放 `sfx/equip.mp3`
- [x] 2.3 `app/components/game/common/shopPurchaseDialog.vue` 的 `handlePurchase`：`result` 為真值分支內播放 `sfx/equip.mp3`
- [x] 2.4 `app/pages/shop.vue` 的 `handlePurchaseFragmentSlot`：`result?.skillFragment` 為真值分支內播放 `sfx/equip.mp3`

## 3. 開始探索 SFX

- [x] 3.1 `app/components/game/character-stage/characterStage.vue` 的 `handleAdventureCta`：確定要 `navigateTo('/adventure')` 前播放 `sfx/exploreStart.mp3`

## 4. 金幣 SFX

- [x] 4.1 `app/pages/quests.vue` 的 `handleClaim`：`claim(...)` 回傳 `true` 時播放 `sfx/gold.mp3`
- [x] 4.2 `app/components/game/common/itemDetailDialog.vue` 的 `handleSell`：`goldEarned !== null` 分支內播放 `sfx/gold.mp3`

## 5. 技能升級 SFX

- [x] 5.1 `app/components/game/inventory-page/skillDialog.vue` 的 `handleUnlock`：改為接收 `unlockSkill(...)` 回傳值，成功時播放 `sfx/skillLevelUp.mp3`
- [x] 5.2 `app/components/game/inventory-page/skillDialog.vue` 的 `handleStrengthen`：既有 `success` 為 `true` 分支內播放 `sfx/skillLevelUp.mp3`

## 6. 天賦加點 SFX

- [x] 6.1 `app/pages/talents.vue` 的 `invest`：既有 `ok` 為 `true` 分支內播放 `sfx/talentPoint.mp3`

## 7. 戰鬥 buff/debuff SFX

- [x] 7.1 `app/composables/useCombat.ts`：新增 buff/debuff 效果類型常數（`HASTE_SELF`/`DEFENSE_UP`/`CRIT_UP`/`SHIELD` = buff；`FREEZE`/`ARMOR_BREAK`/`DOT` = debuff）。改用 optional 注入參數 `playSfx?: (sound: string) => void`（而非直接呼叫 `useAudio()`），避免 `useCombat.test.ts` 在 vitest node 環境下觸發 `useApi()`/`useAuth()` 等 Nuxt runtime 依賴而炸掉
- [x] 7.2 `app/composables/useCombat.ts` 的 `watch(visibleGroupCount, ...)` 內 `fireEntry`：當 `entry.statusEffectKind` 命中 buff 常數時播放 `sfx/buff.mp3`，命中 debuff 常數時播放 `sfx/debuff.mp3`；`app/pages/adventure.vue` 呼叫 `useCombat(...)` 時傳入 `useAudio().playSfx`

## 8. 祝福/詛咒 SFX

- [x] 8.1 `app/pages/adventure.vue` 的 `handleResolveEvent`：設定 `acquiredModifierDialog` 後依 `isBlessing` 播放 `sfx/buff.mp3` 或 `sfx/debuff.mp3`
- [x] 8.2 `app/pages/adventure.vue` 的 `handleSelectBlessing`：設定 `acquiredModifierDialog` 後播放 `sfx/buff.mp3`（BLESSING_SELECT 節點只會給祝福）

## 10. 範圍外追加項目（使用者於實作過程中追加）

- [x] 10.1 修正 `useAudio.ts` 既有 bug：關閉 BGM 開關後再重新打開不會恢復播放（`toggleBgm` 只是切狀態，沒有重新呼叫 `playBgm`）。新增 `lastBgmTrack` 記住最後曲目 + `syncBgmPlayback()` 統一同步播放狀態
- [x] 10.2 新增 `sfx/click.mp3`（ElevenLabs 生成），接到共用按鈕元件 `app/components/system/systemBtn.vue` 的 `handleClick`，讓遊戲內所有透過 `SystemBtn` 的按鈕都有點擊音效（`disabled`/`loading` 狀態不播放）
- [x] 10.3 新增 `sfx/attack.mp3`、`sfx/crit.mp3`（ElevenLabs 生成，揮砍/劍擊風格），接到 `useCombat.ts` 的一般攻擊/爆擊分支（非技能觸發的 `ATTACK`/`CRIT` entry）
- [x] 10.4 修正 `useAudio.ts` 的 `handleAudibilityChange`：分頁「一開始就不可見」時 BGM 從未真正開始播放過（`currentBgm` 為 `null`），原本的恢復邏輯只處理「被我們自己暫停過」的情況，補上 `!currentBgm` 分支涵蓋這種情況，取得焦點後才會真正開始播放
- [x] 10.5 新增 `sfx/hurt.mp3`（ElevenLabs 生成），接到 `useCombat.ts`：一般攻擊/爆擊與技能傷害兩處，當 `entry.targetId === 'player'`（玩家被打中）時額外播放
- [x] 10.6 `click.wav`（使用者提供的素材，取代原本 ElevenLabs 生成的 `click.mp3`）取代 `systemBtn.vue` 的點擊音效檔名
- [x] 10.7 改用使用者提供的素材取代 ElevenLabs 生成版本：`gold.mp3`（sounds_coin.mp3）、`equip.wav`（sounds_equip.wav，原 `equip.mp3` 4 處呼叫點一併更新副檔名）、`bgm/town.mp3`（sounds_prologue.mp3）
- [x] 10.8 受傷音效改用使用者提供的素材並擴大涵蓋範圍：新增 `sfx/hurt.wav`（sounds_ouch.wav，玩家與人類陣營敵人共用）、`sfx/robotHurt.wav`（sounds_robotHurt.wav，GKBOT 陣營敵人專用）。`useCombat.ts` 新增 `hurtSfxFor(targetId)` 依 `getFactionType()` 分流，觸發範圍從原本僅玩家受傷擴大到任何目標受傷（含玩家攻擊敵人時敵人的受傷音效）
- [x] 10.9 新增 `sfx/win.wav`（使用者提供素材），接到 `app/pages/adventure.vue` 的 `watch(combatAnimPlaybackDone, ...)`：`combatVictory.value` 為真時播放，即每場戰鬥勝利結算畫面出現的當下
- [x] 10.10 新增 `sfx/heal.wav`（使用者提供素材）：`adventure.vue` 新增 `watch(healFx, ...)` 涵蓋三個既有來源（藥水/HEAL log、休息節點自動回血、事件節點治療）；`useCombat.ts` 技能自我治療分支（`entry.skillId` 且 `damage < 0`）另外補上，因為這條路徑不經過 `healFx`
- [x] 10.11 重新生成 `bgm/adventure.mp3`：調整為較莊嚴、不那麼緊湊的曲風（原本偏緊張的節奏改為莊重、空間感較大的氛圍曲）
- [x] 10.12 「開始探索」按鈕（`adventureCta.vue`）改為點擊時播放 `sfx/click.wav`（比照一般按鈕點擊回饋），移除 `characterStage.vue` 原本在導覽至 `/adventure` 前播放 `sfx/exploreStart.mp3` 的呼叫
- [x] 10.13 `sfx/exploreStart.mp3` 改接到所有「升級相關」時刻，取代原本各自使用的 `skillLevelUp.mp3`/`talentPoint.mp3`：`skillDialog.vue` 的 `handleUnlock`/`handleStrengthen`、`talents.vue` 的 `invest`。原本的 `skillLevelUp.mp3`/`talentPoint.mp3` 已無任何呼叫端引用，確認為孤兒檔案後刪除

## 9. 驗證

- [x] 9.1 執行 `pnpm nuxt typecheck`，確認新增/修改檔案無新增型別錯誤（既有錯誤：`shopPurchaseDialog.vue:9,78`、`systemBtn.vue:37`、`talents.vue:64`、`useCombat.test.ts:25` 皆不在本次改動行數範圍內，屬既存技術債）
- [x] 9.2 執行 `pnpm lint`，確認新增/修改檔案無新增 lint 錯誤（`systemBtn.vue`/`useAudio.ts` 殘留錯誤/警告皆為既有程式碼，不在本次新增行數內）
- [x] 9.3 啟動 `pnpm dev`，於瀏覽器手動測試：確認頁面載入/切換無 console 錯誤；用 Claude in Chrome 分頁本身無法取得真實 OS 焦點的特性，驗證了「未聚焦不播放」與「取得焦點後恢復播放」兩條路徑（後者因瀏覽器 autoplay 政策需要真實使用者互動才會真的出聲，已確認程式邏輯有正確嘗試播放）；點擊 SystemBtn 確認 click 音效呼叫無錯誤；`curl` 確認全部 `public/audio/**` 檔案（含使用者提供的替換素材）皆可透過 dev server 正常存取（200）。受限於自動化環境無法「聽」聲音，實際音色/音量效果建議由使用者自行在瀏覽器操作確認
