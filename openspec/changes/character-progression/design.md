## Context

`CharacterRepository` 已存在且已有 `prepareInitialCharacterData`/`createCharacter`；`STATS_CONFIG`/`calculateBaseStats` 已存在但只吃 `attributes`。目前完全沒有 `CharacterService`，角色建立邏輯目前寫在 `AccountService.createOrGetAccount` 裡（合理，因為建立時機綁在登入流程），但角色的後續操作（分配點數、暱稱）需要一個獨立的 service 承接，避免全部塞進 `AccountService` 造成職責混淆（AGG-001 vs AGG-002 邊界，見 domain-model.yaml）。

> 更新（2026-08-27）：補血藥水改為一般消耗品物品後，`characters` schema 的 `healingPotion` 欄位（level/coolDownUntil）需一併移除，不再是本 change 的職責範圍。

## Goals / Non-Goals

**Goals:**
- 補齊角色查詢與變更的完整 API 表面
- Stats 計算保持「server 端計算、不落 Firestore」的既有原則（NFR-007、FR-011）
- 資源（gold/gems）與屬性點的邊界檢查在 service 層一次到位，之後 shop/quest/adventure 等 change 呼叫同一個 `CharacterService` 方法即可複用

**Non-Goals:**
- 不在本 change 實作裝備讀取邏輯（`equipment` 欄位已存在於 schema，但實際裝備效果加總屬於 `items-and-equipment` change）
- 不實作藥水相關任何邏輯（補血藥水已改為一般消耗品物品，屬於 `items-and-equipment`〔生成/取得〕與 `adventure-run-core`〔使用〕change 的範圍，與角色端無關）
- 不實作經驗值增加來源（目前分析已標記：文件未明確定義 EXP 從何觸發，可能是 `adventure-run-core` 的 run 結算，屆時再擴充 `CharacterService.addExp`）

## Decisions

- **新增 `CharacterService`，取代把角色邏輯散落在 `AccountService`**：`AccountService.createOrGetAccount` 仍保留建立角色的呼叫（透過 `CharacterRepository.createCharacter`），但角色的查詢/變更一律走新的 `CharacterService`，維持 AGG-001/AGG-002 的服務邊界對齊。
- **`calculateBaseStats` 簽名擴充為可選裝備加成參數**：改為 `calculateStats(attributes, equipmentBonus?)`，本 change 呼叫時 `equipmentBonus` 傳空物件（等同目前行為），待 `items-and-equipment` change 完成後由該 change 負責把實際裝備加總傳入，避免本 change 阻塞在還沒實作的裝備系統上，也避免之後又要改一次函式簽名。
- **屬性點分配的原子性**：以 Firestore 單一文件（`characters/{accountId}`）更新完成，天然原子（單一 aggregate 邊界，見 AGG-002），不需要額外 transaction。

## Risks / Trade-offs

- [風險] `equipmentBonus` 介面預留但本 change 不填入實際值，若後續 `items-and-equipment` change 沒有照約定串接，`GET /api/character` 回傳的 stats 會長期缺少裝備加成 → [緩解] 在 `items-and-equipment` change 的 proposal 中明確列為其 Impact 項目之一（已在該 change 的 tasks 中列出）
- [風險] `unspentAttributePoints` 分配與角色升級（exp 增加時 +3 點）若在不同 change 分別實作，中間可能出現「升級了卻沒拿到點數」的不一致視窗 → [緩解] 本 change 的 `CharacterService` 提供 `addAttributePoints`/`levelUp` 的邏輯介面，之後 run 結算 change 直接呼叫，不重新實作規則

## Migration Plan

- 無資料遷移；`characters` collection 現有欄位已相容（`unspentAttributePoints`、`nickname` 皆已在既有 schema 中，且既有角色建立時已寫入 `unspentAttributePoints: 0`）
