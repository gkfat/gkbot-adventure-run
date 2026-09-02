/**
 * Event templates (type/weight/description/choices) and the wheel's payout
 * table.
 *
 * ASSUMPTION (see events-and-blessings/design.md): `10_事件祝福與詛咒.md`
 * doesn't exist in this repo — the 5 templates below (one per EventType) and
 * the wheel odds/choice costs are invented for this change, themed after
 * docs/worldview.md's "虛擬實境設施" (VR facility, distorted reality) flavor
 * for the wheel event.
 */

import { EventType } from '../../../shared/types/adventure';

export type EventChoiceDefinition = {
    label: string;
    // 'RISK' rolls one RNG draw to decide success/failure; 'SAFE' always succeeds.
    kind: 'RISK' | 'SAFE';
    goldOnSuccess?: number;
    riskCurseOnFailure?: boolean;
};

export type EventTemplate = {
    id: string;
    type: EventType;
    weight: number;
    description: string;
    healPercent?: number; // HEAL only
    choices?: EventChoiceDefinition[]; // CHOICE only
};

export const EVENT_TEMPLATES: EventTemplate[] = [
    {
        id: 'medbay_leak',
        type: EventType.HEAL,
        weight: 25,
        description: '破損的醫療艙還殘留一些藥劑，你決定靠近查看。',
        healPercent: 20,
    },
    {
        id: 'research_terminal',
        type: EventType.BLESSING,
        weight: 15,
        description: '研究設施的終端機還亮著，似乎在提供什麼強化協議。',
    },
    {
        id: 'malfunctioning_unit',
        type: EventType.CURSE,
        weight: 15,
        description: '一台失控的維修機具突然對你噴出不明氣體。',
    },
    {
        id: 'vr_roulette',
        type: EventType.WHEEL,
        weight: 25,
        description: '扭曲的虛擬實境轉盤在你面前浮現，邀請你轉一次。',
    },
    {
        id: 'sealed_crate',
        type: EventType.CHOICE,
        weight: 20,
        description: '一個上鎖的補給箱擋在路上，箱蓋貼著警告標語。',
        choices: [
            {
                label: '強行打開', kind: 'RISK', goldOnSuccess: 30, riskCurseOnFailure: true,
            }, {
                label: '留下箱子離開', kind: 'SAFE', goldOnSuccess: 5,
            },
        ],
    },
];

const EVENT_WEIGHT_TOTAL = EVENT_TEMPLATES.reduce((sum, template) => sum + template.weight, 0);

/**
 * Pick a template given one RNG draw in [0, 1).
 */
export function pickEventTemplate(rngValue: number): EventTemplate {
    const roll = rngValue * EVENT_WEIGHT_TOTAL;
    let cursor = 0;
    for (const template of EVENT_TEMPLATES) {
        cursor += template.weight;
        if (roll < cursor) {
            return template;
        }
    }
    return EVENT_TEMPLATES[0] as EventTemplate; // floating point fallback
}

// Wheel payout table — spec.md "事件轉盤": 3% gems (1~5), rest split gold/item.
export const WHEEL_GEMS_CHANCE = 0.03;
export const WHEEL_GEMS_MIN = 1;
export const WHEEL_GEMS_MAX = 5;
export const WHEEL_GOLD_CHANCE = 0.67; // cumulative window after gems: [0.03, 0.70)
export const WHEEL_RISK_CURSE_CHANCE = 0.5; // 'sealed_crate' choice's RISK failure odds
