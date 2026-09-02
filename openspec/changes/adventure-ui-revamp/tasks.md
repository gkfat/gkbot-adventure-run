## 1. 已停用職業移除（無新美術依賴，可獨立先做）

- [ ] 1.1 `server/constants/templates/characterArchetypes.ts`：刪除 `barbarian`/`rogue`/`paladin`/`wanderer` 4 筆 template，移除檔案頂部「Retired archetypes stay here...」註解；若 `isSelectable` 欄位移除後不再有任何 `false` 值，評估是否簡化型別（僅在確認無其他消費端依賴後才動）
- [ ] 1.2 檢查 `app/components/game/archetypeGallery.vue`、`app/composables/useCharacter.ts` 等前端是否有硬編碼列出/引用這 4 個 archetypeId，一併移除
- [ ] 1.3 更新 `openspec/specs/character-roster/spec.md`：套用本 change 的 delta（移除已停用職業相容顯示情境、移除已停用職業建立角色情境）
- [ ] 1.4 更新 `openspec/specs/character-archetype-abilities/spec.md`：套用本 change 的 delta（移除已停用舊職業查表情境）
- [ ] 1.5 執行 `pnpm vitest run server/constants/templates/characterArchetypes.test.ts`（若存在）與相關 character/roster 測試，確認無殘留對這 4 個 archetypeId 的斷言

## 2. useCombat composable 抽出（Phase A/B 前置）

- [ ] 2.1 新增 `app/composables/useCombat.ts`：把 `combatResultPanel.vue` 現有的 timeline 排程邏輯（依 `combatLog` 算絕對時間戳、`setTimeout` 觸發）搬移過去
- [ ] 2.2 把 `sparkFx`/`cardFx` 兩組 `Map<unitId,{value,key}>` 狀態搬入 `useCombat`，對外提供唯讀 ref/computed
- [ ] 2.3 `combatResultPanel.vue` 改為純渲染層，改用 `useCombat` 回傳的狀態綁 class/圖片，移除原本的計時器/狀態管理程式碼
- [ ] 2.4 執行既有相關測試（`pnpm vitest run`）與手動跑一場戰鬥，確認抽出後既有命中/爆擊/閃避動畫行為不變（迴歸驗證）

## 3. 戰鬥演出強化：傷害飄字 / 閃避文字 / 圖示（Phase B，依賴 2）

- [ ] 3.1 `useCombat` 新增 `damageTextFx`：`Map<unitId,{value,key}>` + `setTimeout` 清除，比照 `sparkFx`/`cardFx` 既有 pattern
- [ ] 3.2 `combatLog` 播放至 `ATTACK`/`CRIT` 時觸發 `damageTextFx`，顯示對應 `damage` 數值飄字；`CRIT` 使用更顯眼的樣式（顏色/大小/圖示區分於一般 `ATTACK`）
- [ ] 3.3 `combatLog` 播放至 `DODGE` 時觸發「閃避」文字效果（不顯示傷害數字）
- [ ] 3.4 新增對應 CSS `@keyframes`（比照現有手刻動畫模式），飄字效果由下往上飄淡出
- [ ] 3.5 手動跑一場戰鬥（含至少一次爆擊與一次閃避），確認飄字/閃避文字/圖示顯眼度符合預期

## 4. HP / 行動條移到角色身側（Phase A，可獨立於 2/3 進行）

- [ ] 4.1 移除 `app/pages/adventure.vue` 中固定於頁面頂端的 `.adventure-page__box` HP 顯示區塊
- [ ] 4.2 在角色圖像旁新增 HP 條與行動條佈局（沿用 Vuetify theme token 顏色、`font-pixel`/`pixel-press` 既有 class）
- [ ] 4.3 確認冒險頁面在角色圖像變動（如日後不同 archetype）時，HP/行動條佈局仍正確跟隨定位，不跑版

## 5. 敵人 avatar：faction × tier lookup（Phase C，依賴美術資產）

- [ ] 5.1 新增前端純函式 `getEnemyAvatarUrl(factionType, tier)`，`tier` 依 `isBoss`/`currentNodeType`（ELITE/STRONG_ELITE）推導，對應 `public/images/enemies/{faction}-{tier}.png`
- [ ] 5.2 用 pixel-art-studio 產出 6 張基礎敵人 avatar（`gkbot-normal/elite/boss`、`human-normal/elite/boss`），576×576、`image-rendering: pixelated`，風格比照現有 `archetypes/*.png`
- [ ] 5.3 我方/敵方 panel 重新設計版面（加入 avatar 顯示區），`combatResultPanel.vue` 套用新版面
- [ ] 5.4 手動測試一般節點/ELITE/STRONG_ELITE/BOSS 各跑一場戰鬥，確認 avatar 對應正確

## 6. 設施背景底圖（Phase D，依賴美術資產）

- [ ] 6.1 用 pixel-art-studio 產出背景底圖：`DEEP_WRECK`/`PARTIAL_ACTIVE`/`HIGHLY_ACTIVE` 三張基礎背景，視需要再補 BOSS 節點專屬覆蓋背景
- [ ] 6.2 新增前端純函式 `getFacilityBackgroundUrl(severityTier, currentNodeType)`：有專屬覆蓋圖優先，否則 fallback 至 severityTier 預設圖
- [ ] 6.3 `app/pages/adventure.vue` 套用背景底圖顯示
- [ ] 6.4 手動測試三種 severityTier 與至少一種有專屬覆蓋背景的節點類型，確認背景切換正確

## 7. 角色背面圖（Phase E，依賴美術資產，5 個現行職業）

- [ ] 7.1 用 pixel-art-studio 為 `fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler` 各產出 `{name}-back.png`，576×576、`image-rendering: pixelated`，風格比照現有正面圖
- [ ] 7.2 冒險頁面角色顯示切換為背面圖（比照 `app/utils/spriteDisplay.ts` 現有換圖邏輯擴充）

## 8. 推進走路動畫 + 背景移動感（Phase F，依賴 6、7）

- [ ] 8.1 用 pixel-art-studio 為 5 個現行職業各產出走路動畫幀 `{name}-back-walk-{1,2,3}.png`
- [ ] 8.2 新增 `app/composables/useWalkFrame.ts`（結構比照既有 `useIdleBreathingFrame.ts`），僅在 `advance()` 呼叫期間啟用幀切換
- [ ] 8.3 背景新增位移/視差 CSS 動畫，於走路動畫播放期間同步觸發移動感
- [ ] 8.4 確保走路動畫與 `advance()` API 回應為獨立關注點：API 提早回應不阻塞/延遲動畫播放，動畫也不阻塞新節點狀態最終顯示（對應 spec `adventure-run-presentation` 的「推進 API 回應早於動畫播放完畢」情境）
- [ ] 8.5 手動測試點擊推進，確認走路動畫、背景移動感、新節點狀態切換三者皆正常銜接

## 9. 收尾驗證

- [ ] 9.1 `pnpm lint` 通過
- [ ] 9.2 `pnpm vitest run` 全數通過（含既有 server 測試無迴歸）
- [ ] 9.3 `pnpm build` 通過（型別檢查）
- [ ] 9.4 手動走過完整一輪冒險（進入 → 推進 → 戰鬥 → 事件/祝福 → 結算），確認 6 項改版與已停用職業移除皆生效且無視覺/邏輯異常
- [ ] 9.5 更新 `known-issue.md`，勾除本次已完成的待辦項目
