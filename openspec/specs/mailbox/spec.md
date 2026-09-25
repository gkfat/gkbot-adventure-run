# mailbox

## Purpose

提供角色信箱功能：伺服器內部 service 可對指定角色發送信件（可附帶 gold/gems/道具獎勵），玩家可在頂部列信箱下拉選單查看信件列表，並於信件內容 dialog 中領取獎勵。新角色建立時自動收到一封附帶固定獎勵的歡迎信。

## Requirements

### Requirement: 伺服器端發信介面
系統 SHALL 提供伺服器內部介面（非對外 API），供其他 service 對指定角色發送一封信，信件可附帶 `rewardGold`、`rewardGems`、`rewardItemIds` 其中零至多項獎勵。信件不接受任何 client 直接建立。

#### Scenario: 發送含獎勵的信件
- **WHEN** 其他 service 呼叫 `MailboxService.send(characterId, title, body, rewards)` 且 `rewards` 含 gold/gems/道具其中至少一項
- **THEN** 該角色的信箱新增一封 `unclaimed` 狀態的信件，內容包含指定的標題、內文與獎勵

#### Scenario: 發送無獎勵的通知信
- **WHEN** 呼叫 `MailboxService.send` 且 `rewards` 為空
- **THEN** 該角色的信箱新增一封信件，領取（claim）後僅標記已讀，不觸發任何資源入帳

### Requirement: 查詢自己角色的信件列表
系統 SHALL 提供 `GET /api/character/{characterId}/mailbox`，回傳該角色所有信件，依建立時間新到舊排序，每筆包含標題、內文、獎勵內容與 `unclaimed`/`claimed` 狀態。

#### Scenario: 查詢信件列表
- **WHEN** 玩家對自己的角色呼叫 `GET /api/character/{characterId}/mailbox`
- **THEN** 回傳該角色的信件列表，依建立時間新到舊排序

#### Scenario: 查詢他人角色的信件列表
- **WHEN** 玩家對非自己帳號名下的 characterId 呼叫此 API
- **THEN** 系統 SHALL 拒絕並回傳錯誤，不洩漏該角色是否存在

### Requirement: 領取信件獎勵
系統 SHALL 提供 `POST /api/character/{characterId}/mailbox/{mailId}/claim`，將信件的附加獎勵一次性入帳到該角色（gold/gems 直接入帳、道具加入該角色的永久背包），並將信件標記為 `claimed`；已領取的信件不得重複入帳。

#### Scenario: 領取含金幣/鑽石的信件
- **WHEN** 玩家對一封 `unclaimed` 且含 `rewardGold`/`rewardGems` 的信件呼叫 claim
- **THEN** 角色的 gold/gems 依信件內容增加，信件狀態變為 `claimed`

#### Scenario: 領取含道具的信件且背包有空間
- **WHEN** 玩家對一封含 `rewardItemIds` 的信件呼叫 claim，且該角色背包尚有空間
- **THEN** 對應道具加入角色背包，信件狀態變為 `claimed`

#### Scenario: 領取含道具的信件但背包已滿
- **WHEN** 玩家對一封含 `rewardItemIds` 的信件呼叫 claim，但該角色背包已達上限
- **THEN** 系統 SHALL 拒絕整筆領取（不部分入帳），信件維持 `unclaimed`，回傳明確的背包已滿錯誤

#### Scenario: 重複領取已領取的信件
- **WHEN** 玩家對一封已經是 `claimed` 狀態的信件再次呼叫 claim
- **THEN** 系統 SHALL 拒絕，不重複入帳任何獎勵

### Requirement: 主頁頂部列提供信箱進入口與下拉選單
系統 SHALL 在主頁頂部列（設定齒輪圖示旁）提供信箱圖示按鈕，點擊後以下拉選單（非全頁）呈現目前選定角色的信件列表；每筆列項顯示完整標題（不得截斷）、獎勵圖示與已讀/未讀狀態（`unclaimed` 顯示「未讀」、`claimed` 顯示「已讀」），不在列表內提供領取按鈕。含任一獎勵（gold/gems/道具其中之一大於零）的信件 SHALL 以單一寶箱圖示代表「這封信有獎勵」，不個別列出金幣/鑽石圖示。

#### Scenario: 點擊信箱圖示開啟下拉選單
- **WHEN** 玩家點擊頂部列的信箱圖示
- **THEN** 系統在圖示下方展開下拉選單，顯示目前選定角色的信件列表，每筆列項含完整標題、獎勵圖示與已讀/未讀狀態

#### Scenario: 標題不截斷
- **WHEN** 信件標題長度超過列項可視寬度
- **THEN** 系統 SHALL 完整顯示標題文字（可換行），不得以刪節號或其他方式截斷

#### Scenario: 含獎勵的信件顯示寶箱圖示
- **WHEN** 某封信件的 `rewardGold`、`rewardGems`、`rewardItemIds` 其中至少一項大於零
- **THEN** 該信件列項顯示單一寶箱圖示，不個別顯示金幣/鑽石圖示

#### Scenario: 未讀信件標示「未讀」
- **WHEN** 下拉選單中的某封信件狀態為 `unclaimed`
- **THEN** 該信件列項右側 SHALL 標示「未讀」

#### Scenario: 已讀信件標示「已讀」
- **WHEN** 下拉選單中的某封信件狀態為 `claimed`
- **THEN** 該信件列項右側 SHALL 標示「已讀」

### Requirement: 點擊信件開啟信件內容 dialog 並於其中領取
系統 SHALL 在玩家點擊下拉選單中的任一信件時，開啟一個顯示該信完整內容（標題、內文、獎勵）的 dialog；含獎勵且 `unclaimed` 的信件 SHALL 在獎勵內容上方以小標題明確標示「可領取獎勵」，並於 dialog 底部提供「領取獎勵」按鈕，另提供「關閉」按鈕；`claimed` 的信件僅提供「關閉」按鈕。

#### Scenario: 點擊信件開啟內容 dialog
- **WHEN** 玩家點擊下拉選單中的一封信件
- **THEN** 系統開啟該信件的內容 dialog，顯示標題、內文與獎勵，底部含操作按鈕

#### Scenario: 含獎勵的未讀信件顯示「可領取獎勵」標題
- **WHEN** 玩家開啟一封 `unclaimed` 且含獎勵的信件內容 dialog
- **THEN** dialog 內獎勵內容上方 SHALL 顯示小標題「可領取獎勵」

#### Scenario: 於內容 dialog 中領取未讀信件
- **WHEN** 玩家在 `unclaimed` 信件的內容 dialog 中按下「領取獎勵」
- **THEN** 系統呼叫領取 API，成功後該信件狀態變為 `claimed`，下拉選單中對應列項的狀態同步更新為「已讀」

#### Scenario: 已讀信件的內容 dialog 不提供領取按鈕
- **WHEN** 玩家點擊一封 `claimed` 信件開啟內容 dialog
- **THEN** dialog 底部僅顯示「關閉」按鈕，不提供「領取獎勵」按鈕

#### Scenario: 含獎勵的已讀信件顯示「已領取獎勵」標題
- **WHEN** 玩家開啟一封 `claimed` 且含獎勵的信件內容 dialog
- **THEN** dialog 內獎勵內容上方 SHALL 顯示小標題「已領取獎勵」，與 `unclaimed` 的「可領取獎勵」視覺區隔

#### Scenario: 有未領取信件時圖示顯示紅點
- **WHEN** 目前選定角色至少有一封 `unclaimed` 信件
- **THEN** 頂部列信箱圖示 SHALL 顯示紅點 badge

#### Scenario: 沒有未領取信件時不顯示紅點
- **WHEN** 目前選定角色沒有任何 `unclaimed` 信件（含尚無信件的情況）
- **THEN** 頂部列信箱圖示不顯示紅點 badge

### Requirement: 新角色建立時自動獲得歡迎信
系統 SHALL 於角色建立完成時，透過 `MailboxService.send()` 自動發送一封歡迎信給該角色，附帶固定的歡迎獎勵（金幣與鑽石）；獎勵需玩家於信箱中主動點擊領取，不自動入帳。

#### Scenario: 建立新角色觸發歡迎信
- **WHEN** 玩家建立一個新角色
- **THEN** 該角色的信箱新增一封 `unclaimed` 狀態的歡迎信，附帶固定數量的 `rewardGold` 與 `rewardGems`

#### Scenario: 歡迎信獎勵需主動領取
- **WHEN** 新角色剛建立完成、玩家尚未領取歡迎信
- **THEN** 該角色的 gold/gems 不因建立角色而自動增加，必須等玩家在信箱中領取該封信後才入帳

### Requirement: 領取信件獎勵時顯示通用獲得獎勵 dialog
系統 SHALL 在玩家於信箱中成功領取任一封信件的獎勵後，顯示一個通用（非僅限信箱使用）的「獲得獎勵」dialog，列出本次入帳的 gold/gems/道具數量。

#### Scenario: 領取含金幣鑽石的信件後顯示獲得獎勵 dialog
- **WHEN** 玩家在信件內容 dialog 中成功領取一封含 `rewardGold`/`rewardGems` 的信件
- **THEN** 系統顯示獲得獎勵 dialog，列出實際入帳的金幣與鑽石數量
