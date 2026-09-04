import {
    describe, it, expect,
} from 'vitest';

import {
    TALENT_TREES, getTalentTreeByArchetypeId,
} from './talentTrees';

const SELECTABLE_ARCHETYPE_IDS = [
    'fighter',
    'adventurer',
    'scholar',
    'tinkerer',
    'gambler',
];

describe('TALENT_TREES', () => {
    it('has exactly one tree per selectable archetype', () => {
        expect(Object.keys(TALENT_TREES).sort()).toEqual([...SELECTABLE_ARCHETYPE_IDS].sort());
    });

    it.each(SELECTABLE_ARCHETYPE_IDS)('%s tree has exactly 7 nodes: tier 1/3/5 single, tier 2/4 a matching branch pair', (archetypeId) => {
        const tree = getTalentTreeByArchetypeId(archetypeId);
        expect(tree).toBeDefined();
        expect(tree!.nodes).toHaveLength(7);

        for (const tier of [
            1,
            3,
            5,
        ]) {
            const nodes = tree!.nodes.filter(n => n.tier === tier);
            expect(nodes).toHaveLength(1);
            expect(nodes[0]!.branchGroup).toBeUndefined();
        }

        for (const tier of [2, 4]) {
            const nodes = tree!.nodes.filter(n => n.tier === tier);
            expect(nodes).toHaveLength(2);
            expect(nodes[0]!.branchGroup).toBeDefined();
            expect(nodes[0]!.branchGroup).toBe(nodes[1]!.branchGroup);
        }
    });

    it.each(SELECTABLE_ARCHETYPE_IDS)('%s tree: every node has maxRank 3', (archetypeId) => {
        const tree = getTalentTreeByArchetypeId(archetypeId)!;
        for (const node of tree.nodes) {
            expect(node.maxRank).toBe(3);
        }
    });

    it('all nodeIds are globally unique', () => {
        const allNodeIds = Object.values(TALENT_TREES).flatMap(tree => tree.nodes.map(n => n.nodeId));
        expect(new Set(allNodeIds).size).toBe(allNodeIds.length);
    });

    it('getTalentTreeByArchetypeId returns undefined for an unknown archetype', () => {
        expect(getTalentTreeByArchetypeId('does_not_exist')).toBeUndefined();
    });
});
