/**
 * Season-end settlement reward tiers, keyed by rank. See
 * leaderboard-season/design.md — adjust numbers here, logic stays untouched.
 */

export const LEADERBOARD_SEASON_REWARDS = {
    TOP_1: {
        rewardGold: 500, rewardGems: 20,
    },
    TOP_2_TO_3: {
        rewardGold: 300, rewardGems: 12,
    },
    TOP_4_TO_10: {
        rewardGold: 150, rewardGems: 6,
    },
    TOP_11_PLUS: {
        rewardGold: 50, rewardGems: 2,
    },
};

/**
 * Resolve the reward tier for a 1-indexed rank.
 */
export function getSeasonRewardForRank(rank: number): { rewardGold: number; rewardGems: number } {
    if (rank === 1) return LEADERBOARD_SEASON_REWARDS.TOP_1;
    if (rank <= 3) return LEADERBOARD_SEASON_REWARDS.TOP_2_TO_3;
    if (rank <= 10) return LEADERBOARD_SEASON_REWARDS.TOP_4_TO_10;
    return LEADERBOARD_SEASON_REWARDS.TOP_11_PLUS;
}
