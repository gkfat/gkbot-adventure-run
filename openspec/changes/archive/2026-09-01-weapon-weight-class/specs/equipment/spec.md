## ADDED Requirements

### Requirement: 左右手互換裝備
系統 SHALL 允許 HAND 類道具（`equipSlot` 屬於 `HAND_SLOTS = [LEFT_HAND, RIGHT_HAND]`）裝備到 `LEFT_HAND` 或 `RIGHT_HAND` 任一槽位，由呼叫端以 `requestedSlot` 指定；因此角色可組成雙武器或雙防具。若 `requestedSlot` 未指定，系統 SHALL 使用該道具 template 的預設 `equipSlot`。

#### Scenario: 指定裝到另一手
- **WHEN** 玩家對一件 `equipSlot = RIGHT_HAND` 的武器呼叫 `equip`，並帶入 `requestedSlot = LEFT_HAND`
- **THEN** 該道具裝備到 `LEFT_HAND` 槽位

#### Scenario: 雙武器組合
- **WHEN** 玩家先把一件武器裝到 `RIGHT_HAND`，再把另一件武器指定 `requestedSlot = LEFT_HAND` 裝上
- **THEN** 兩個手部槽位皆為武器類道具，系統不拒絕此組合

#### Scenario: 雙防具組合
- **WHEN** 玩家先把一件防具裝到 `LEFT_HAND`，再把另一件防具指定 `requestedSlot = RIGHT_HAND` 裝上
- **THEN** 兩個手部槽位皆為防具類道具，系統不拒絕此組合

#### Scenario: 未指定 requestedSlot 時使用預設槽位
- **WHEN** 玩家裝備一件 `equipSlot = RIGHT_HAND` 的道具，未帶 `requestedSlot`
- **THEN** 該道具裝備到 `RIGHT_HAND`（與現行行為一致）

### Requirement: 不合法的 requestedSlot 回傳錯誤
系統 SHALL 在 `requestedSlot` 不屬於 `HAND_SLOTS`，或該道具本身不是 HAND 類道具卻帶入 `requestedSlot` 時，回傳 400，不修改 `equipment`。

#### Scenario: requestedSlot 不屬於 HAND_SLOTS
- **WHEN** 玩家裝備一件 HAND 類道具，帶入 `requestedSlot = HEAD`
- **THEN** 系統回傳 400，`equipment` 不變

#### Scenario: 非 HAND 類道具帶入 requestedSlot
- **WHEN** 玩家裝備一件 `equipSlot = HEAD` 的道具，帶入 `requestedSlot = LEFT_HAND`
- **THEN** 系統回傳 400，`equipment` 不變

> 取代現行 `equipItem`（`equipment.service.ts`）在 `requestedSlot` 不合法時靜默 fallback 回 `item.equipSlot` 的行為。
