/**
 * Blessing candidate generation — 3-pick weighted toward MAJOR tier as LUCK
 * increases (events-and-blessings/design.md's "候選生成" decision).
 */

import { BaseService } from './base.service';
import { RngService } from './rng.service';
import {
    BLESSING_TEMPLATES, majorTierChance, type BlessingTemplate,
} from '../../shared/constants/blessings';
import type { RunModifier } from '../../shared/types/adventure';

const CANDIDATE_COUNT = 3;

export class BlessingService extends BaseService {
    protected serviceName = 'blessing';
    private rngService: RngService;

    constructor() {
        super();
        this.rngService = new RngService();
    }

    /**
     * Pick 3 distinct Blessing candidates. Every RNG draw goes through
     * RngService (design.md Goal: all randomness auditable via seed+rngIndex).
     *
     * Falls back to the other tier when the preferred tier's pool is already
     * exhausted (BLESSING_TEMPLATES only has 2 MINOR/3 MAJOR entries right
     * now) — without this, a run of same-tier rolls could loop forever
     * trying to draw from an empty pool.
     */
    async generateCandidates(runId: string, luck: number): Promise<RunModifier[]> {
        const chosen: BlessingTemplate[] = [];
        const majorChance = majorTierChance(luck);

        while (chosen.length < CANDIDATE_COUNT) {
            const tierRoll = await this.rngService.next(runId);
            const preferredTier = tierRoll < majorChance ? 'MAJOR' : 'MINOR';

            const remaining = BLESSING_TEMPLATES.filter(
                template => !chosen.some(c => c.modifierId === template.modifierId),
            );
            const preferredPool = remaining.filter(template => template.tier === preferredTier);
            const pool = preferredPool.length > 0 ? preferredPool : remaining;

            const pickRoll = await this.rngService.next(runId);
            const picked = pool[Math.floor(pickRoll * pool.length)] as BlessingTemplate;
            chosen.push(picked);
        }

        return chosen.map((template) => {
            const modifier: Partial<BlessingTemplate> = { ...template };
            delete modifier.tier;
            return modifier as RunModifier;
        });
    }
}
