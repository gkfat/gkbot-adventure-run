## Why

`audio-settings-frontend` change 已經建好 `useAudio()` composable（`playBgm`/`playSfx`/`bgmEnabled`/`sfxEnabled`）與帳號層級的開關 UI，`/sound-effects` 也已產出 9 個像素風遊戲音檔（2 首 BGM loop + 7 個 SFX）放在 `public/audio/`，但目前全專案沒有任何地方呼叫 `playBgm`/`playSfx`——音效系統形同虛設，玩家開關切了也聽不到任何聲音。這個 change 要把既有音檔實際接上對應的遊戲事件。

## What Changes

- 在 `app/layouts/game.vue`（所有遊戲內頁面共用的 layout）依路由是否為 `/adventure` 自動切換播放 `bgm/town.mp3`（未冒險）或 `bgm/adventure.mp3`（冒險中），登出離開 layout 時停止播放
- 在下列既有互動成功後播放對應 SFX（呼叫 `useAudio().playSfx(...)`，只在原本判斷「成功」的分支內插入，不改變既有邏輯/API 呼叫）：
  - 裝備穿上／脫下／購買（含商店道具購買、技能碎片購買）→ `sfx/equip.mp3`
  - 開始探索（角色主畫面「開始探索」CTA 成功導向冒險頁）→ `sfx/exploreStart.mp3`
  - 收穫金幣（領取任務獎勵、販售裝備）→ `sfx/gold.mp3`
  - 技能升級（解鎖新技能、強化技能）→ `sfx/skillLevelUp.mp3`
  - buff（戰鬥中套用增益類技能效果、取得祝福）→ `sfx/buff.mp3`
  - debuff（戰鬥中套用減益/控場類技能效果、取得詛咒）→ `sfx/debuff.mp3`
  - 天賦加點 → `sfx/talentPoint.mp3`

## Capabilities

### New Capabilities
- `game-audio-triggers`：定義遊戲內哪些操作/場景會觸發哪個 BGM/SFX，作為前端音效串接的行為規範。

### Modified Capabilities
（無，`openspec/specs/` 目前沒有涵蓋音效播放時機的既有 spec；這是全新能力）

## Impact

- `app/layouts/game.vue`：新增依路由切換 BGM 的邏輯
- `app/components/game/character-stage/characterStage.vue`：開始探索成功後播放 SFX
- `app/components/game/common/itemDetailDialog.vue`：裝備穿/脫/販售成功後播放 SFX
- `app/components/game/common/shopPurchaseDialog.vue`、`app/pages/shop.vue`：購買成功後播放 SFX
- `app/pages/quests.vue`：領取任務獎勵成功後播放 SFX
- `app/pages/talents.vue`：天賦加點成功後播放 SFX
- `app/components/game/inventory-page/skillDialog.vue`：技能解鎖/強化成功後播放 SFX
- `app/composables/useCombat.ts`：戰鬥中 buff/debuff 類技能效果生效時播放 SFX
- `app/pages/adventure.vue`：取得祝福/詛咒（`acquiredModifierDialog`）時播放 buff/debuff SFX
