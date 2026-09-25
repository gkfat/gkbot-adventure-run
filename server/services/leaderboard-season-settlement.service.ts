/**
 * Leaderboard season settlement — reads the season that just ended, ranks
 * every entry, and mails each character its tiered reward. Triggered only
 * by the cron endpoint (server/api/cron/leaderboard-season-settle.get.ts).
 * See leaderboard-season/design.md.
 */

import { BaseService } from './base.service';
import { LeaderboardRepository } from '../repositories/leaderboard.repository';
import { MailboxService } from './mailbox.service';
import { getPreviousSeasonId } from '../utils/season';
import { getSeasonRewardForRank } from '../constants/leaderboardSeason';

export class LeaderboardSeasonSettlementService extends BaseService {
    protected serviceName = 'leaderboard-season-settlement';
    private leaderboardRepo = new LeaderboardRepository();
    private mailboxService = new MailboxService();

    /**
     * Settle the season that just ended (relative to `now`): rank every
     * entry by score (already descending from getAllForSeason) and mail
     * each character its tier's reward. No-op if the season has no entries.
     */
    async settlePreviousSeason(now: Date = new Date()): Promise<{ seasonId: string; mailsSent: number }> {
        const seasonId = getPreviousSeasonId(now);
        const entries = await this.leaderboardRepo.getAllForSeason(seasonId);

        for (const [index, entry] of entries.entries()) {
            const rank = index + 1;
            const {
                rewardGold, rewardGems,
            } = getSeasonRewardForRank(rank);

            await this.mailboxService.send(
                entry.characterId,
                `${seasonId} 賽季結算`,
                `本賽季排行榜結算完畢，你的角色「${entry.nickname}」以 ${entry.score} 分排名第 ${rank} 名，獎勵已附上。`,
                {
                    gold: rewardGold, gems: rewardGems, 
                },
            );
        }

        this.logInfo('Leaderboard season settled', {
            action: 'settlePreviousSeason',
            data: {
                seasonId, mailsSent: entries.length, 
            },
        });

        return {
            seasonId, mailsSent: entries.length,
        };
    }
}
