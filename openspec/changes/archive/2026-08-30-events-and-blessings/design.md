## Context

`11_事件祝福與詛咒.md` 把 Blessing/Curse 都建議抽象成同一種 `RunModifier`（已在 domain-model.yaml 定為 VO-009），本 change 負責填入這個抽象的「具體內容」（有哪些 Blessing/Curse、各自的效果）。祝福點數的命名與門檻曲線在來源文件中標記為 TBD，本 change 需要做出具體決策才能實作。

## Goals / Non-Goals

**Goals:**
- 事件/轉盤/祝福的隨機判定全部透過 `adventure-run-core` 的 `RngService`
- Blessing/Curse 效果與 `combat-engine` 的 `applyModifiers` 介面相容（共用同一個 RunModifier 型別）

**Non-Goals:**
- 不解決轉盤付費加抽（FR-074 needs-review，明確排除於本 change）
- 不最終決定祝福點數的正式命名與數值曲線的長期平衡（本 change 先給一個可運作的預設值，供 playtest 調整，見下方 Decisions）

## Decisions

- **祝福點數命名為 `blessingPoints`**：直接沿用 domain-model.yaml 的 ENT-010 欄位命名（分析階段已選定此名稱），不再引入其他命名，避免歧義。
- **門檻曲線（已被上游 change 實作，本 change 沿用不重新定義）**：`adventure-run-core` 已定義 `NODE_CONFIG.BLESSING_POINTS_THRESHOLD = 3`；`combat-engine` 已實作每場戰鬥依節點 tier 給予固定 `blessingPointsGained`（NORMAL=1／ELITE=2／STRONG_ELITE=3，見 `server/constants/combat.ts` 的 `blessingPointsForVictory`），不是依 enemyLevel 逐格累加。這兩者都已實作並通過瀏覽器測試，本 change 只需沿用，不再自訂第二套門檻/給分數值；`server/constants/blessings.ts` 若要放相關常數，應直接參照既有實作。
- **祝福候選生成**：固定 3 選 1，候選池依目前 LUCK 值以權重方式偏向更稀有/更強的 Blessing（沿用與 item rarity 類似的 roll 邏輯，但獨立一份權重表，不與物品稀有度混用）。
- **Curse 觸發時機**：由事件的 choice 結果或特定事件類型直接附加，不透過「候選選擇」介面（詛咒是被動降臨，不像祝福是玩家主動選擇），符合 `11_事件祝福與詛咒.md` 的描述。

## Risks / Trade-offs

- [風險] `blessingPointsThreshold=100` 與 `enemyLevel` 給分是本 change 自訂的初版數值，若與整體遊戲節奏不搭（太快/太慢觸發祝福）→ [可接受]：已標記為 CTX-ASM-005 範疇內的可調參數，playtest 後可直接改常數檔，不需改架構
- [風險] Blessing/Curse 效果種類若後續大幅擴充，`applyModifiers`（`combat-engine` change 提供）需要能處理新的 effect 類型 → [緩解]：`RunModifier.effect` 定義為結構化的 `{ target: 'ATK'|'DEF'|'HP_MAX'|'dropRate'|'shopPrice'|..., op: 'ADD'|'MULTIPLY', value: number }`，新增效果只需擴充 target enum，不需改動套用邏輯本身
