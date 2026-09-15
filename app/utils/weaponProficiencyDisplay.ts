/**
 * Display-only labels for the weapon proficiency panel (weapon-proficiency-system
 * D5/D9) — passive flavor names aren't specified anywhere else (design.md only
 * gives numeric effects), invented here for the UI, kept in one place so they
 * stay consistent with any future combat-log text.
 */
import { WeaponType } from '../../shared/types/common';

export const WEAPON_PROFICIENCY_DIMENSION_LABEL: Record<WeaponType | 'DUAL_WIELD', string> = {
    [WeaponType.FIST]: '拳套',
    [WeaponType.BLADE]: '刀劍',
    [WeaponType.BLUNT]: '鈍器',
    [WeaponType.POLEARM]: '長柄',
    [WeaponType.RANGED]: '槍械',
    DUAL_WIELD: '雙持',
};

type PassiveLabels = { aName: string; aDescription: string; bName: string; bDescription: string };

export const WEAPON_PASSIVE_LABEL: Record<WeaponType | 'DUAL_WIELD', PassiveLabels> = {
    [WeaponType.FIST]: {
        aName: '連擊超頻',
        aDescription: '爆擊後短暫提升攻速',
        bName: '怒濤連拳',
        bDescription: '連續命中後下一擊爆擊率大幅提升',
    },
    [WeaponType.BLADE]: {
        aName: '致命一擊',
        aDescription: '爆擊傷害額外提升',
        bName: '趁虛而入',
        bDescription: '目標血量較高時造成額外傷害',
    },
    [WeaponType.BLUNT]: {
        aName: '破防打擊',
        aDescription: '命中後使目標短暫更容易受到傷害',
        bName: '悶擊眩暈',
        bDescription: '爆擊時有機率延遲目標的下次行動',
    },
    [WeaponType.POLEARM]: {
        aName: '橫掃姿態',
        aDescription: '濺射攻擊的次要目標傷害比例提升',
        bName: '貫穿打擊',
        bDescription: 'AoE 攻擊時主目標傷害提升，並提升自身觸發機率',
    },
    [WeaponType.RANGED]: {
        aName: '精準集中',
        aDescription: '命中後短暫提升爆擊率',
        bName: '連環爆擊',
        bDescription: '連續命中達門檻時，下一擊必定爆擊',
    },
    DUAL_WIELD: {
        aName: '雙持追擊',
        aDescription: '命中時有機率觸發一次追加攻擊',
        bName: '雙持精通',
        bDescription: '雙持時 AoE／濺射觸發機率額外提升',
    },
};

export const PROFICIENCY_PASSIVE_LEVELS = {
    A_UNLOCK: 4,
    A_STRENGTHEN: 8,
    B_UNLOCK: 6,
    B_MASTERY: 10,
} as const;
