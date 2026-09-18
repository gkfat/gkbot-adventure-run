import type {
    CombatLogEntry, CombatSummary, 
} from '../../shared/types/adventure';

/**
 * 將 CombatLogEntry 轉成可讀文字，供戰鬥演出與冒險記事本共用。
 */
export const describeCombatLogEntry = (entry: CombatLogEntry, enemies: CombatSummary['enemies']): string => {
    const unitName = (id: string) => {
        if (id === 'player') return '你';
        return enemies.find(enemy => enemy.enemyId === id)?.name ?? '敵人';
    };

    const actor = unitName(entry.actorId);
    const target = unitName(entry.targetId);

    switch (entry.action) {
    case 'DODGE': return `${target} 閃避了 ${actor} 的攻擊`;
    case 'CRIT': return `${actor} 對 ${target} 造成 ${entry.damage} 點暴擊傷害`;
    case 'DEATH': return `${target} 被擊敗`;
    case 'SKILL': {
        const skillName = entry.skillName ?? '技能';
        if (entry.damage === undefined) return `${actor} 使用了「${skillName}」`;
        if (entry.damage < 0) return `${actor} 使用「${skillName}」恢復了 ${-entry.damage} 點生命`;
        return `${actor} 使用「${skillName}」對 ${target} 造成 ${entry.damage} 點傷害`;
    }
    default: return `${actor} 對 ${target} 造成 ${entry.damage} 點傷害`;
    }
};
