# 天賦樹數值表（perRank）

> 本文件是內部設計參考文件，記錄 `server/constants/templates/talentTrees.ts`（`TALENT_TREES`）各節點的 `perRank` 數值，供後續戰鬥數值曲線驗證與平衡調整參考。機制規則（分層開放、岔路互斥、maxRank）見 `docs/game-design/mechanics/progression.md` 第 2 節與 `character-talent-tree` change 的 spec。

**未經實際戰鬥數值曲線驗證**：以下數值取小幅、與現有 `STATS_CONFIG`（如 `STR_TO_ATK = 2.5`）同量級的保守值，正式平衡調整待後續依實測數據追蹤（見 `known-issue.md`）。

每個節點 `maxRank = 3`；下表數值為**每級**增量（`perRank`），滿級數值 = `perRank × 3`。

## fighter（戰士）

| nodeId | Tier | name | perRank |
|---|---|---|---|
| `fighter_t1` | 1 | 體魄鍛鍊 | HP_MAX +15／DEF +2／carryCapacity +1 |
| `fighter_t2a` | 2 | 剛毅意志 | DEF +3 |
| `fighter_t2b` | 2 | 蠻力衝擊 | ATK +3 |
| `fighter_t3` | 3 | 沉重打擊 | ATK +2／DEF +1 |
| `fighter_t4a` | 4 | 銅牆鐵壁 | DEF +5／actionIntervalSec +0.05（變慢） |
| `fighter_t4b` | 4 | 破陣猛攻 | ATK +5 |
| `fighter_t5` | 5 | 不屈之軀 | HP_MAX +40／DEF +4 |

## adventurer（冒險家）

| nodeId | Tier | name | perRank |
|---|---|---|---|
| `adventurer_t1` | 1 | 輕裝疾行 | actionIntervalSec -0.03／dodgeChance +0.01 |
| `adventurer_t2a` | 2 | 靈巧步伐 | dodgeChance +0.02 |
| `adventurer_t2b` | 2 | 疾風連擊 | actionIntervalSec -0.05 |
| `adventurer_t3` | 3 | 隨機應變 | carryCapacity +2／dodgeChance +0.01 |
| `adventurer_t4a` | 4 | 影步 | dodgeChance +0.04 |
| `adventurer_t4b` | 4 | 迅捷本能 | actionIntervalSec -0.08 |
| `adventurer_t5` | 5 | 探索者之心 | ATK +3／dodgeChance +0.02 |

## scholar（學者）

| nodeId | Tier | name | perRank |
|---|---|---|---|
| `scholar_t1` | 1 | 戰術洞察 | critChance +0.02／ATK +2 |
| `scholar_t2a` | 2 | 精準打擊 | critChance +0.03 |
| `scholar_t2b` | 2 | 弱點分析 | ATK +4 |
| `scholar_t3` | 3 | 冷靜分析 | DEF +2／critChance +0.01 |
| `scholar_t4a` | 4 | 致命一擊 | critChance +0.05 |
| `scholar_t4b` | 4 | 博學強化 | ATK +6 |
| `scholar_t5` | 5 | 大師手筆 | ATK +5／critChance +0.03 |

## tinkerer（工匠）

| nodeId | Tier | name | perRank |
|---|---|---|---|
| `tinkerer_t1` | 1 | 裝備強化 | DEF +2／actionIntervalSec -0.02 |
| `tinkerer_t2a` | 2 | 加固護甲 | DEF +4 |
| `tinkerer_t2b` | 2 | 潤滑機構 | actionIntervalSec -0.04 |
| `tinkerer_t3` | 3 | 隨行工具 | carryCapacity +3／HP_MAX +10 |
| `tinkerer_t4a` | 4 | 重裝改造 | DEF +6 |
| `tinkerer_t4b` | 4 | 高速齒輪 | actionIntervalSec -0.06 |
| `tinkerer_t5` | 5 | 巧匠傑作 | DEF +5／actionIntervalSec -0.05 |

## gambler（投機者）

| nodeId | Tier | name | perRank |
|---|---|---|---|
| `gambler_t1` | 1 | 幸運本能 | critChance +0.02／dodgeChance +0.01 |
| `gambler_t2a` | 2 | 賭徒直覺 | critChance +0.03 |
| `gambler_t2b` | 2 | 死裡逃生 | dodgeChance +0.03 |
| `gambler_t3` | 3 | 孤注一擲 | ATK +3／critChance +0.01 |
| `gambler_t4a` | 4 | 全下 | critChance +0.05 |
| `gambler_t4b` | 4 | 命運女神 | dodgeChance +0.05 |
| `gambler_t5` | 5 | 賭王之運 | critChance +0.03／dodgeChance +0.03 |

## 尚待確認 / 資料缺口

- 每級發放量已由 +3 調整為 +1（見 `CharacterRepository.settleRunRewards`）：滿點單一路徑（Tier1+2+3+4+5，5 個節點各 3 級）需 15 點，30 級角色最多累積 29 點（29 次升級 × 1 點），扣掉滿點一條路徑後僅剩約 14 點餘量，不足以再滿點另一條分支（岔路互斥，多餘點數只能投在已選分支之外的節點，但那些節點已投滿後無處可花）——是否進一步調整發放量或擴充天賦樹層數/節點，待後續依實測數據評估。
