## Context

`accounts/{accountId}` 文件目前 schema 為 strict mode（`accountSchema.strict()`），新增欄位必須同步更新 schema 與既有文件的預設值處理（既有帳號沒有這兩個欄位時，讀取端需要 fallback，不能直接因 `.strict()` 解析失敗而炸掉）。

## Goals / Non-Goals

**Goals:**
- 讓玩家的 BGM/SFX 開關狀態可跨裝置持久化
- 保持與既有 `account.repository.ts` / `account.service.ts` 的既有分層一致（Controller → Service → Repository）

**Non-Goals:**
- 不處理音量大小（只有布林開關，符合 spec：「可控制開啟或關閉」）
- 不做前端播放邏輯（`useAudio()` composable 等前端串接，另由前端實作 change 或後續 UI 相關 change 處理；本 change 僅涵蓋 server 端 API/資料）

## Decisions

- **欄位預設值處理**：新帳號建立時直接寫入 `bgmEnabled: true, sfxEnabled: true`；既有帳號（若有）在讀取時若欄位缺失，repository 層以 `?? true` 補齊，不做一次性 migration script（帳號數量少，且下次寫入會自然補齊欄位）。
- **獨立 endpoint 而非塞進 `/api/character`**：音效設定屬於 Account（AGG-001），角色（AGG-002）狀態變化頻率高很多，混在一起會讓 character 更新的交易邊界模糊，故用獨立的 `PUT /api/account/settings`。
- **允許部分更新**：request body 的 `bgmEnabled`/`sfxEnabled` 皆為 optional，只更新有帶的欄位（PATCH 語意但沿用專案既有的 PUT 命名慣例）。

## Risks / Trade-offs

- [風險] `.strict()` schema 若忘記加新欄位會導致既有帳號讀取失敗 → [緩解] 本 change 的 tasks 明確包含更新 `accountSchema` 並跑一次型別檢查（`pnpm nuxt typecheck`）
- [風險] 前端尚未串接時，此 API 會孤立存在 → [可接受]：本 change 範圍明確界定在 server 端，前端串接可用既有的 `useApi`/`useAuth` composable 模式後續補上，不阻塞此 change 的價值（API 文件會透過 infra-and-docs change 一併曝露在 Swagger UI）
