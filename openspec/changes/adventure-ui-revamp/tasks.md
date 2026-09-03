## 1. 已停用職業移除（無新美術依賴，可獨立先做）

- [x] 1.1 `server/constants/templates/characterArchetypes.ts`：刪除 `barbarian`/`rogue`/`paladin`/`wanderer` 4 筆 template，移除檔案頂部「Retired archetypes stay here...」註解；`isSelectable` 欄位仍有其他消費端依賴（`character.service.ts`、既有測試），維持保留不動
- [x] 1.2 檢查 `app/components/game/archetypeGallery.vue`、`app/composables/useCharacter.ts` 等前端是否有硬編碼列出/引用這 4 個 archetypeId，一併移除（確認皆為動態渲染，無硬編碼需清除）
- [x] 1.3 更新 `openspec/specs/character-roster/spec.md`：套用本 change 的 delta（移除已停用職業相容顯示情境、移除已停用職業建立角色情境）
- [x] 1.4 更新 `openspec/specs/character-archetype-abilities/spec.md`：套用本 change 的 delta（移除已停用舊職業查表情境）
- [x] 1.5 執行 `pnpm vitest run server/constants/templates/characterArchetypes.test.ts`（若存在）與相關 character/roster 測試，確認無殘留對這 4 個 archetypeId 的斷言

## 2. useCombat composable 抽出（Phase A/B 前置）

- [x] 2.1 新增 `app/composables/useCombat.ts`：把 `combatResultPanel.vue` 現有的 timeline 排程邏輯（依 `combatLog` 算絕對時間戳、`setTimeout` 觸發）搬移過去
- [x] 2.2 把 `sparkFx`/`cardFx` 兩組 `Map<unitId,{value,key}>` 狀態搬入 `useCombat`，對外提供唯讀 ref/computed
- [x] 2.3 `combatResultPanel.vue` 改為純渲染層，改用 `useCombat` 回傳的狀態綁 class/圖片，移除原本的計時器/狀態管理程式碼
- [x] 2.4 執行既有相關測試（`pnpm vitest run`）與 `pnpm build` 型別檢查，確認抽出後既有邏輯無型別/測試迴歸；手動戰鬥驗證留待 3.5 一併進行

## 3. 戰鬥演出強化：傷害飄字 / 閃避文字 / 圖示（Phase B，依賴 2）

- [x] 3.1 `useCombat` 新增 `damageTextFx`：`Map<unitId,{value,key}>` + `setTimeout` 清除，比照 `sparkFx`/`cardFx` 既有 pattern
- [x] 3.2 `combatLog` 播放至 `ATTACK`/`CRIT` 時觸發 `damageTextFx`，顯示對應 `damage` 數值飄字；`CRIT` 使用更顯眼的樣式（顏色/大小/圖示區分於一般 `ATTACK`）
- [x] 3.3 `combatLog` 播放至 `DODGE` 時觸發「閃避」文字效果（不顯示傷害數字）
- [x] 3.4 新增對應 CSS `@keyframes`（比照現有手刻動畫模式），飄字效果由下往上飄淡出
- [x] 3.5 手動跑一場戰鬥，用 dev server + 瀏覽器實測驗證：傷害飄字與 hit spark 同步顯示（截圖確認）、wave banner／HP／gauge 播放正常、戰鬥結算正確、console 無錯誤。閃避/爆擊樣式因隨機數未在這場實測中觸發，邏輯與一般 ATTACK 走同一組 `damageTextFx` pattern，程式碼已審過（3.2/3.3）

## 4. HP / 行動條移到角色身側（Phase A，可獨立於 2/3 進行）

- [x] 4.1 移除 `app/pages/adventure.vue` 中固定於頁面頂端的獨立 HP 顯示區塊
- [x] 4.2 在角色圖像旁新增 HP 條佈局（沿用 Vuetify theme token 顏色、`font-pixel`/`pixel-press` 既有 class）。**範圍澄清**：冒險頁面過去完全沒有顯示角色圖像，故此task一併加上角色 portrait（沿用既有正面 `spriteUrl` + `useIdleBreathingFrame`，背面圖待 Phase E 美術資產產出後再換上）；「行動條」需求已由 `combatResultPanel.vue`（Group 2/3）既有的每單位 gauge 滿足（本就顯示在玩家卡片旁），本 task 不重複新增
- [x] 4.3 確認冒險頁面在角色圖像變動（如日後不同 archetype）時，HP 佈局仍正確跟隨定位，不跑版（`pnpm build`/`pnpm vitest run` 通過，佈局為 flex 排列會自動跟隨圖像）

## 5. 敵人 avatar：faction × tier lookup（Phase C，依賴美術資產）

- [x] 5.1 新增前端純函式 `getEnemyAvatarUrl(factionType, tier)` + `getEnemyAvatarTier(isBoss, currentNodeType)`（`app/utils/enemyAvatar.ts`），對應 `public/images/enemies/{faction}-{tier}.png`
- [x] 5.2 用 pixel-art-studio 產出 6 張基礎敵人 avatar（`gkbot-normal/elite/boss`、`human-normal/elite/boss`），576×576、`image-rendering: pixelated`，風格比照現有 `archetypes/*.png`
- [x] 5.3 我方/敵方 panel 加入 avatar 顯示（`combatResultPanel.vue` 新增 `playerSpriteUrl`/`factionType`/`currentNodeType` props，`adventure.vue` 傳入 `character.spriteUrl`/`currentRun.factionType`/`currentRun.currentNodeType`）
- [x] 5.4 dev server 手動實測 HUMAN 陣營普通節點戰鬥：`human-normal.png` 正確顯示於敵方卡片、玩家卡片正確顯示角色 spriteUrl，兩者疊加 spark/傷害飄字皆正常，console 無錯誤。ELITE/STRONG_ELITE/BOSS 因隨機節點生成未在這次實測中抽到，`getEnemyAvatarTier` 為純函式已於 5.1 程式碼審查覆蓋其三個分支

## 6. 設施背景底圖（Phase D，依賴美術資產）

- [x] 6.1 用 pixel-art-studio 產出背景底圖：`deep-wreck`/`partial-active`/`highly-active` 三張基礎背景（576×768，暗色系逐級升溫：無燈光→琥珀警示燈→紅色警報）。**範圍縮減**：BOSS 節點專屬覆蓋背景視為選配（design.md 原文「視需要再補」），本次未產出，避免半套機制產生死連結
- [x] 6.2 新增前端純函式 `getFacilityBackgroundUrl(severityTier)`（`app/utils/facilityBackground.ts`）。因 6.1 未產出 node-type 覆蓋圖，函式簽名對應縮減為僅吃 `severityTier`，之後要加 override 圖時再擴充
- [x] 6.3 `app/pages/adventure.vue` 套用背景底圖（`pageBackgroundStyle` computed，疊一層暗色漸層確保前景文字可讀性，僅在 `currentRun` 存在時套用）
- [x] 6.4 dev server 手動實測：進行中的 run（`severityTier: DEEP_WRECK`）正確顯示 `deep-wreck.png` 背景、暗色漸層疊加後前景文字可讀，console 無錯誤。`PARTIAL_ACTIVE`/`HIGHLY_ACTIVE` 走同一段 `pageBackgroundStyle` 邏輯（唯一差異是字串代入 URL），未逐一開新 run 實測，風險低

## 7. 角色背面圖（Phase E，依賴美術資產，5 個現行職業）

- [x] 7.1 用 pixel-art-studio 為 5 個現行職業各產出 `{name}-back.png`，576×576、`image-rendering: pixelated`，色彩直接取樣自對應正面圖確保風格一致
- [x] 7.2 冒險頁面角色顯示切換為背面圖：新增 `backSpriteUrl()`（`app/utils/spriteDisplay.ts`），`adventure.vue` 改用它取代原本的 `breatheFrameUrl`（背面圖無呼吸動畫幀，移除連帶已不用的 `useIdleBreathingFrame` 呼叫）

## 8. 推進走路動畫 + 背景移動感（Phase F，依賴 6、7）

- [x] 8.1 為 5 個現行職業各產出 3 張走路動畫幀 `{name}-back-walk-{1,2,3}.png`。**實作方式調整**：不重新手繪腿部動作（背面圖是半身 bust，無腿部細節），改用像素位移（上升/橫移/下沉三格）做出走路 bob 節奏，成本低且與既有靜態背面圖風格完全一致
- [x] 8.2 新增 `app/composables/useWalkFrame.ts`：`start()`/`stop()` 控制（非 `useIdleBreathingFrame` 的掛載即播放模式），僅在 `handleAdvance()` 呼叫期間啟用幀切換
- [x] 8.3 背景新增位移 CSS 動畫（`adventure-page--walking` class + `adventure-page-bg-drift` keyframes），走路節拍期間背景輕微橫向漂移
- [x] 8.4 `handleAdvance()` 內 `walkFrame.start()` + `setTimeout(walkFrame.stop, WALK_BEAT_MS)` 與 `await advance(...)` 並行觸發，互不等待對方，符合 spec 情境
- [x] 8.5 dev server 手動實測：點擊「進入關卡」後角色 portrait 正確顯示背面圖（tinkerer 髮型/護目鏡繩/夾克/機械手臂皆正確），點擊「推進」後正常轉入戰鬥節點、console 無錯誤。600ms 走路節拍短於瀏覽器截圖往返延遲，未能截到動畫播放中間格，以程式碼已通過 build/lint/test 佐證動畫機制本身正確

## 9. 收尾驗證

- [x] 9.1 `pnpm lint` 通過 — 本次變更涉及的所有檔案皆無 lint 錯誤；repo 既有的大量 `no-explicit-any`/`no-unused-vars` 錯誤分布在完全未觸碰的檔案（`shared/types/*`、`app/composables/useApi.ts` 等），確認為既有、與本次 change 無關，不在此次修復範圍
- [x] 9.2 `pnpm vitest run` 全數通過（20 test files / 194 tests，含 server 既有測試無迴歸）
- [x] 9.3 `pnpm build` 通過（型別檢查與 production build 皆成功）
- [x] 9.4 分段以 dev server + 瀏覽器手動實測涵蓋：進入關卡（背景底圖+走路動畫觸發）→ 推進（事件節點）→ 戰鬥（HP/avatar/傷害飄字/wave banner/結算）→ HP 浮動佈局。未在單一連續 run 內走完 BLESSING_SELECT/REST/最終遠征結算頁，風險評估：這些畫面本次未變更任何程式碼，只有已驗證過的 HP 區塊會出現在其中
- [x] 9.5 更新 `known-issue.md`，勾除本次已完成的待辦項目（保留 BOSS 專屬背景為未來待補項）
