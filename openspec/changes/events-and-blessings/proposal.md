## Why

`adventure-run-core` 的狀態機骨架已能推進到 EVENT 與 BLESSING_SELECT 狀態，但沒有實際的事件模板、轉盤結果、祝福候選生成邏輯。沒有這一塊，run 的「風險 vs 回報」與 build 多樣性完全無法呈現。

## What Changes

- 新增事件模板（補血/送祝福/降臨詛咒/轉盤/決策分岔）與帶 cost/reward/risk 的 choices
- 新增事件轉盤：3% 機率掉落 gems 1~5（與其他物品/金幣結果並存）
- 新增祝福選擇：累積「祝福點數」達門檻觸發 BLESSING_SELECT，候選稀有度/品質受 LUCK 影響
- 新增 `POST /api/adventure/event/resolve`、`POST /api/adventure/blessing/select`：實作 `adventure-run-core` 定義的 `EventResolver` 介面

## Capabilities

### New Capabilities
- `adventure-events`：隨機事件模板、choices 結算、轉盤
- `blessings-and-curses`：RunModifier 的具體效果定義、祝福候選生成與選擇

## Impact

- 實作 `adventure-run-core` change 定義的 `EventResolver` 介面，取代其 stub
- 新增 `server/constants/events.ts`：事件模板（type/weight/description/choices）
- 新增 `server/constants/blessings.ts`：Blessing/Curse 效果定義（RunModifier 的具體內容，例如 +ATK、+HP、掉落提升、-DEF、商店更貴…）
- 新增 `server/services/event.service.ts`：事件選定、choice 結算、轉盤判定
- 新增 `server/services/blessing.service.ts`：祝福點數累積、候選生成（受 LUCK 影響）、選擇後寫入 run 的 active modifiers
- 依賴 `deterministic-rng`（`adventure-run-core` change）
- 依賴 `quests-and-achievements` 的 `incrementProgress`（gems 掉落來源之一，也可能影響任務進度）
- 對應分析：FR-039、FR-058~059、FR-071~074、UC-024、UC-029~030、AGG-009/VO-009（domain-model.yaml）、API-025/026（api-model.yaml）、DATA-005（data-model.yaml）、RULE-015

## 待確認事項

- FR-074（轉盤是否可付費加抽）尚未定案，本 change 先只實作單次免費轉動，不做付費加抽的擴充點（若之後啟用，屬於經濟系統的獨立決策，需另開 change 評估對 gold/gems 供給的影響）
