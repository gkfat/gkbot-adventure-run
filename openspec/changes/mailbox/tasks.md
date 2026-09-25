## 1. Shared types & schemas

- [x] 1.1 新增 `shared/types/mailbox.ts`（`MailMessage`、狀態 `unclaimed`/`claimed`）
- [x] 1.2 新增 `shared/schemas/firestore/mailbox.schema.ts`，並於 `shared/schemas/firestore/index.ts` 匯出
- [x] 1.3 新增 `shared/schemas/api/mailbox.schema.ts`（`GetMailboxResponse`、`ClaimMailResponse`），並於 `shared/schemas/api/index.ts` 匯出

## 2. Repository

- [x] 2.1 新增 `server/repositories/mailbox.repository.ts`：`create(characterId, title, body, rewards)`、`listByCharacter(characterId)`、`claim(characterId, mailId)`（transaction：檢查 `unclaimed` 後標記 `claimed`）

## 3. Service

- [x] 3.1 新增 `server/services/mailbox.service.ts`：`send(characterId, title, body, rewards)`（供其他 service 呼叫）、`getMailbox(accountId, characterId)`（含擁有權驗證）、`claim(accountId, characterId, mailId)`（transaction 內完成信件標記 + gold/gems 入帳 + 道具入庫，複用 `CharacterRepository`/`InventoryRepository`）

## 4. API

- [x] 4.1 新增 `server/api/character/[characterId]/mailbox/index.get.ts`
- [x] 4.2 新增 `server/api/character/[characterId]/mailbox/[mailId]/claim.post.ts`

## 5. 文件與驗證

- [x] 5.1 於 `server/utils/openapi.ts` 註冊兩個新路徑（`Mailbox` tag）
- [x] 5.2 執行 `pnpm nuxt typecheck`
- [x] 5.3 單元測試：含道具背包已滿時整筆回滾、重複 claim 被拒絕、無獎勵信件 claim 後僅標記已讀、擁有權驗證（不可查詢/領取他人角色的信件）
- [x] 5.4 `firestore.indexes.json` 新增 `mailMessages`（`characterId` ASC + `createdAt` DESC）複合索引並部署（實測時發現 `listByCharacter` 缺索引導致 500；同時移除先前 `leaderboard` change 誤加的 `leaderboardEntries.score` 單欄位索引——Firestore 單欄位索引本就自動建立，該筆索引被部署拒絕）

## 6. 前端信箱下拉選單

- [x] 6.1 新增 `app/composables/useMailbox.ts`：呼叫 `GET .../mailbox` 取得列表、`POST .../mailbox/{mailId}/claim` 領取，領取成功後本地樂觀更新該信件狀態為 `claimed`
- [x] 6.2 修改 `app/components/game/layouts/header.vue`：齒輪圖示左側新增信箱圖示按鈕，點擊以 `v-menu` 展開下拉選單
- [x] 6.3 新增 `app/components/game/common/mailboxMenu.vue`：信件列表，`claimed` 信件疊加半透明遮罩；`unclaimed` 信件可點擊領取
- [x] 6.4 手動驗證：實際起 dev server + 建立新角色，走完整流程（頂部圖示紅點 → 開啟下拉選單 → 看到歡迎信 → 點擊領取 → 通用獲得獎勵 dialog 顯示 +300/+5 → gold/gems 實際入帳 → 信件變半透明已讀樣式 → 紅點消失），過程中發現並修正 6.5/6.6 兩個真實 bug
- [x] 6.5 `useMailbox.ts` 新增 `hasUnclaimed`；`header.vue` 進頁面即抓取信箱狀態，有未領取信件時圖示顯示紅點 badge（比照 `bottomNav.vue` 的 `__dot-badge` 樣式）。實測發現 `onMounted` 早於 `selectedCharacterId` resolve 導致紅點永遠不出現，改用 `watch(selectedCharacterId, fetchMailbox, { immediate: true })`
- [x] 6.6 修正 `v-menu` 定位錯誤：移除誤加的 `attach=".game-shell"`（導致下拉選單位置整個跑掉），並補上 `.mailbox-menu` 容器本身缺少的背景/邊框樣式（原本只有內部 row 有背景，容器本身透明看起來像「浮空文字」）

## 7. 新角色歡迎信

- [x] 7.1 新增 `server/constants/mailbox.ts`：`WELCOME_MAIL`（標題/內文/`rewardGold: 300`/`rewardGems: 5`）
- [x] 7.2 `server/services/character.service.ts` 的 `createCharacterFromArchetype` 注入 `MailboxService`，建立角色成功後呼叫 `send()` 發送歡迎信

## 8. 通用獲得獎勵 dialog

- [x] 8.1 新增 `app/components/game/common/rewardClaimedDialog.vue`：接受 `{ gold?, gems?, itemCount? }`，非信箱專屬、可供其他領取流程共用
- [x] 8.2 `mailboxMenu.vue` 領取信件成功後開啟 `rewardClaimedDialog`，帶入該次 claim 回應的 `goldEarned`/`gemsEarned`/`itemIdsAdded.length`

## 9. 下拉選單改為精簡列表 + 信件內容 dialog

- [x] 9.1 `mailboxMenu.vue` 列表項目改為：標題 + 獎勵圖示（gold/gems/道具數量）+ 右側「未讀」/「已讀」狀態文字，移除列表內的領取按鈕，點擊整列開啟信件內容 dialog
- [x] 9.2 新增 `app/components/game/common/mailDetailDialog.vue`：顯示信件標題、內文、獎勵；`unclaimed` 顯示「領取獎勵」+「關閉」；`claimed` 僅顯示「關閉」
- [x] 9.3 領取獎勵於 `mailDetailDialog` 內觸發，成功後關閉內容 dialog、開啟 `rewardClaimedDialog`，並同步下拉選單列表狀態
- [x] 9.4 啟動 dev server 手動驗證：列表精簡樣式、點擊開啟內容 dialog、未讀信領取流程、已讀信只能關閉（真實建立測試角色走完整流程，用 JS 逐步確認 dialog 疊層時序，確認 reward dialog 正確顯示且不自動消失）

## 10. 列表視覺微調

- [x] 10.1 `mailboxMenu.vue`：標題不截斷（移除 ellipsis，改可換行）
- [x] 10.2 `mailboxMenu.vue`：含獎勵的信件改顯示單一寶箱圖示，移除個別金幣/鑽石圖示。圖示為新繪製的 `treasureChest`（非既有的 `chest`——那是身體裝甲圖示，語意不同），加入 `scripts/pixel-art/game-icons/build.py` 的 `HAND_AUTHORED_ICONS` 與 `app/utils/pixelIcons.ts` 的 `PixelIconName`，並補進 `preloadAssets.ts`
- [x] 10.3 `mailDetailDialog.vue`：含獎勵的未讀信在獎勵內容上方加小標題「可領取獎勵」
- [x] 10.4 `mailDetailDialog.vue`：含獎勵的已讀信在獎勵內容上方加小標題「已領取獎勵」，與未讀的「可領取獎勵」視覺區隔（灰階 vs 綠色），已在瀏覽器實測確認
