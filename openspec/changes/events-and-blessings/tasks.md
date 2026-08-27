## 1. 模板常數

- [ ] 1.1 新增 `server/constants/events.ts`：事件模板（type/weight/description/choices）
- [ ] 1.2 新增 `server/constants/blessings.ts`：Blessing/Curse 效果定義、`blessingPointsThreshold`、per-enemyLevel 給分規則

## 2. 事件服務

- [ ] 2.1 新增 `server/services/event.service.ts`：`selectEvent(run)`、`resolveChoice(run, choiceIndex)`、`spinWheel(run)`（含 gems 3% 機率規則）
- [ ] 2.2 實作 `EventResolver` 介面（取代 `adventure-run-core` 的 stub）

## 3. 祝福服務

- [ ] 3.1 新增 `server/services/blessing.service.ts`：`accumulatePoints(run, enemyLevel)`、`generateCandidates(run, luck)`、`selectBlessing(run, blessingId)`
- [ ] 3.2 Run 結束時清空所有生效中 RunModifier（於 `adventure-run-core` 的 `settleRun` 呼叫本 change 提供的清空函式，或直接由 run 文件刪除即代表失效——確認與 `adventure-run-core` change 的整合點）

## 4. API

- [ ] 4.1 新增 `server/api/adventure/event/resolve.post.ts`
- [ ] 4.2 新增 `server/api/adventure/blessing/select.post.ts`

## 5. 文件與驗證

- [ ] 5.1 於 `server/utils/openapi.ts` 註冊 2 個新路徑
- [ ] 5.2 執行 `pnpm nuxt typecheck`
- [ ] 5.3 手動驗證：事件選擇/choice 結算、轉盤 gems 掉落機率、祝福累積達門檻觸發、候選稀有度隨 LUCK 變化、run 結束後 modifier 不殘留
