<template>
    <div class="combat-result-panel">
        <div class="d-flex ga-4 text-caption text-medium-emphasis mb-2">
            <span>回合 {{ result.summary.roundCount }}</span>
            <span v-if="result.summary.scoreGained">分數 +{{ result.summary.scoreGained }}</span>
            <span v-if="result.summary.goldDropped">金幣 +{{ result.summary.goldDropped }}</span>
            <span v-if="result.summary.gemsDropped">寶石 +{{ result.summary.gemsDropped }}</span>
        </div>
        <div
            v-if="result.summary.itemsDropped.length > 0"
            class="text-caption text-medium-emphasis mb-2"
        >
            掉落物品 x{{ result.summary.itemsDropped.length }}
        </div>

        <div class="combat-result-panel__log">
            <div
                v-for="(entry, index) in result.combatLog"
                :key="index"
                class="text-caption combat-result-panel__entry"
            >
                {{ describeEntry(entry) }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { CombatApiResult } from '../../composables/useAdventureRun';
import type { CombatLogEntry } from '../../../shared/types/adventure';

const props = defineProps<{ result: CombatApiResult }>();

const unitName = (id: string) => {
    if (id === 'player') return '你';
    return props.result.summary.enemies.find(enemy => enemy.enemyId === id)?.name ?? '敵人';
};

const describeEntry = (entry: CombatLogEntry) => {
    const actor = unitName(entry.actorId);
    const target = unitName(entry.targetId);

    switch (entry.action) {
        case 'DODGE': return `${target} 閃避了 ${actor} 的攻擊`;
        case 'CRIT': return `${actor} 對 ${target} 造成 ${entry.damage} 點暴擊傷害`;
        case 'DEATH': return `${target} 被擊敗`;
        default: return `${actor} 對 ${target} 造成 ${entry.damage} 點傷害`;
    }
};
</script>

<style scoped lang="scss">
.combat-result-panel {
    &__log {
        max-height: 160px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    &__entry {
        opacity: 0.85;
    }
}
</style>
