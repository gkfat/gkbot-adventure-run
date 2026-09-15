/**
 * Blessing candidate generation — candidates are drawn only from families the
 * character hasn't maxed out (Lv3), weighted toward higher rarity as LUCK
 * increases (blessing-leveling/design.md Decision 3).
 */

import { BaseService } from './base.service';
import { RngService } from './rng.service';
import {
    BLESSING_TEMPLATES, rarityWeights, pickWeightedRarity,
    type BlessingTemplate, type BlessingCandidate,
} from '../../shared/constants/blessings';
import type { BlessingEntry } from '../../shared/types/adventure';

const CANDIDATE_COUNT = 3;
const MAX_LEVEL = 3;

export class BlessingService extends BaseService {
    protected serviceName = 'blessing';
    private rngService: RngService;

    constructor() {
        super();
        this.rngService = new RngService();
    }

    /**
     * Pick up to 3 distinct Blessing family candidates, each carrying the
     * level it would grant/upgrade to if chosen. Families already at Lv3 are
     * excluded entirely — if fewer than 3 families remain eligible, fewer
     * candidates are returned (never throws/hangs).
     */
    async generateCandidates(
        runId: string, luck: number, ownedBlessings: BlessingEntry[],
    ): Promise<BlessingCandidate[]> {
        const ownedLevelByFamily = new Map(ownedBlessings.map(entry => [entry.modifierId, entry.level]));
        const eligible = BLESSING_TEMPLATES
            .map(template => ({
                template, ownedLevel: ownedLevelByFamily.get(template.modifierId) ?? 0,
            }))
            .filter(({ ownedLevel }) => ownedLevel < MAX_LEVEL);

        const targetCount = Math.min(CANDIDATE_COUNT, eligible.length);
        const weights = rarityWeights(luck);
        const chosen: { template: BlessingTemplate; nextLevel: number }[] = [];

        while (chosen.length < targetCount) {
            const remaining = eligible.filter(
                candidate => !chosen.some(c => c.template.modifierId === candidate.template.modifierId),
            );

            // Reward RNG stream (keyed by runId, not `seed`) so blessing
            // candidates differ across retries of the same Stage
            // (known-issue.md #1).
            const rarityRoll = await this.rngService.nextReward(runId);
            const preferredRarity = pickWeightedRarity(weights, rarityRoll);
            const preferredPool = remaining.filter(candidate => candidate.template.rarity === preferredRarity);
            const pool = preferredPool.length > 0 ? preferredPool : remaining;

            const pickRoll = await this.rngService.nextReward(runId);
            const picked = pool[Math.floor(pickRoll * pool.length)] as { template: BlessingTemplate; ownedLevel: number };
            chosen.push({
                template: picked.template, nextLevel: picked.ownedLevel + 1,
            });
        }

        return chosen.map(({
            template, nextLevel, 
        }) => ({
            modifierId: template.modifierId,
            name: template.name,
            description: template.description,
            isBlessing: true,
            rarity: template.rarity,
            level: nextLevel,
            ...template.levels[nextLevel - 1],
        }));
    }
}
