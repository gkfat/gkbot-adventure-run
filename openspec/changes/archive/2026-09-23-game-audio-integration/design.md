## Context

`useAudio()`（`app/composables/useAudio.ts`）已提供 `playBgm(track)`/`stopBgm()`/`playSfx(sound)`，`bgmEnabled`/`sfxEnabled` 為 `false` 或音檔載入/播放失敗時內部已靜默失敗（`console.warn`，不拋例外），呼叫端不需要額外防呆。音檔已存在於 `public/audio/bgm/{town,adventure}.mp3` 與 `public/audio/sfx/{equip,exploreStart,gold,skillLevelUp,buff,debuff,talentPoint}.mp3`。

全部 7 個遊戲頁面（`main`/`shop`/`inventory`/`quests`/`talents`/`gacha`/`adventure`）都使用同一個 `app/layouts/game.vue` layout；`game.vue` 已有 `isAdventurePage = computed(() => route.path === '/adventure')`，是切換 BGM 的天然掛勾點，且 layout 元件在同 layout 的頁面間導覽不會重新掛載，只有 `watch(route, ...)` 能感知頁面切換。

各 SFX 對應的既有互動全部已經有明確的「成功」分支（多半是 `if (success)`/`if (ok)`/`if (result)` 這種既有寫法），插入音效呼叫不需要新增任何錯誤處理或改變既有的 API 呼叫時機。

## Goals / Non-Goals

**Goals:**
- 依路由自動切換 BGM（未冒險 ↔ 冒險中），登出時停止播放
- 在既有「操作成功」分支插入對應 SFX，不改變既有業務邏輯
- 戰鬥中 buff/debuff 類技能效果生效時播放對應 SFX

**Non-Goals:**
- 不新增音檔素材（已有的 9 個檔案已覆蓋 proposal 列出的所有事件）
- 不做音量大小/混音控制、不做 BGM 淡入淡出（`useAudio.playBgm` 目前是直接切換，`stopBgm()`/`new Audio()` 已在內部處理，維持現況）
- 不擴大到 proposal 未列出的事件（例如每日補給箱領取、技能佩戴/卸下到欄位）——這些也會觸發成功分支，但使用者這次明確只列了 7 種事件，不做額外延伸

## Decisions

- **BGM 切換集中在 `game.vue` layout 的單一 `watch`**，而非分散在每個頁面各自 `onMounted` 播放：因為 layout 元件跨頁面導覽不會重新掛載，若把 `playBgm` 放在 `main.vue`/`adventure.vue` 各自的 `onMounted`，從 `/main` 導到 `/shop` 不會重新掛載 `main.vue`（不影響），但從 `/adventure` 回 `/main` 這種同 layout 內的路由切換，`main.vue` 的 `onMounted` 不會因為「回到這個頁面」而重新觸發（Nuxt page 元件在路由變化時才會重新掛載，同路徑不會）——用 `watch(isAdventurePage, ..., { immediate: true })` 集中在 layout 層是唯一能同時覆蓋「首次進入」與「後續切換」的位置。
  ```ts
  const { playBgm, stopBgm } = useAudio();
  watch(isAdventurePage, (isAdventure) => {
      playBgm(isAdventure ? 'adventure.mp3' : 'town.mp3');
  }, { immediate: true });
  onUnmounted(() => stopBgm());
  ```
- **登出時停止 BGM 用 `onUnmounted`，不額外在 `handleSignOut` 呼叫 `stopBgm()`**：`useAuth().signOut()` 成功後會 `router.push('/')`，`/` 用 `default` layout，`game.vue` 因此卸載，`onUnmounted` 自然觸發，不需要在 `accountDrawer.vue` 的 `handleSignOut` 裡手動呼叫，避免兩處都要維護同一件事。
- **SFX 一律插在既有「成功」分支內，用既有變數名判斷**（`success`/`ok`/`result`/`goldEarned !== null` 等），不新增額外的 try/catch 或 loading 狀態——因為每個呼叫點都已經有現成的成功判斷邏輯，音效播放是純粹的「順便做的事」，不應該影響原本的錯誤處理路徑。
- **技能解鎖（`unlockSkill`）與強化（`strengthenSkill`）共用 `skillLevelUp.mp3`**：兩者都是「這個技能變強了」的廣義升級，玩家不需要靠音效區分「從無到有解鎖」vs「既有技能加值」；而技能佩戴/卸下（`equipSkill`）不算裝備或升級事件，不在此次範圍內播放任何音效（維持沉默，需要的話可另開 change）。
- **buff/debuff 涵蓋兩種來源**：戰鬥中即時生效的技能狀態效果（`CombatLogEntry.statusEffectKind`）與跨戰鬥的祝福/詛咒（`RunModifier.isBlessing`）。兩者語意上都符合玩家理解的「buff/debuff」，且都已有明確的資料可判斷正負向，一併涵蓋不算範圍擴張：
  - 戰鬥技能效果：`SkillEffectKind` 中 `HASTE_SELF`/`DEFENSE_UP`/`CRIT_UP`/`SHIELD` 視為 buff，`FREEZE`/`ARMOR_BREAK`/`DOT` 視為 debuff；`DAMAGE_*`/`HEAL_SELF` 不算 buff/debuff，維持現況不播放
  - 祝福/詛咒：`RunModifier.isBlessing === true` 播 `buff.mp3`，否則（詛咒）播 `debuff.mp3`
- **插入點選最貼近「使用者觸發」而非「API 回應」的地方時，一律以現有程式碼的既有分支為準，不自創新的判斷時機**：例如「開始探索」選在 `characterStage.vue` 的 `handleAdventureCta` 內 `navigateTo('/adventure')` 之前（API 成功後），而非 `adventureCta.vue` 的 `handleStart`（純 UI 按下動畫、尚未呼叫 API）——因為後者在「已有進行中的 run」分支時 `justStarting` 邏輯不會執行、但仍會導覽成功，音效應該綁定「確定要進冒險頁了」這個結果，不是「按鈕被按下」。

## Risks / Trade-offs

- [風險] `game.vue` 的 `watch(isAdventurePage, ...)` 只偵測 `/adventure` 這一個路徑，如果之後新增其他「冒險中」相關路由（目前沒有）會漏判 → [可接受]：目前架構冒險流程只有 `/adventure` 一個路由，維持與 `game.vue` 既有 `isAdventurePage` 定義完全一致，之後架構變動時一併調整即可
- [風險] `useCombat.ts` 的 `fireEntry` 內插入 buff/debuff 音效判斷，若同一批（group）entries 短時間內多筆都命中會疊音 → [可接受]：`playSfx` 每次呼叫都是獨立的 `new Audio()`，瀏覽器原生支援疊加播放多個短音效，不會互相打斷，符合戰鬥演出「多個效果幾乎同時發生」的預期
