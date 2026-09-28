<template>
    <div class="podium-column d-flex flex-column align-center">
        <span
            v-if="entry?.killCount"
            class="podium-column__kills font-pixel text-caption d-flex align-center ga-1 mb-1"
        >
            <v-icon
                icon="mdi-sword-cross"
                size="10"
            />
            {{ entry.killCount }}
        </span>

        <div
            v-if="entry?.spriteUrl"
            class="podium-column__sprite-wrap"
        >
            <img
                :src="idleFrameUrl(entry.spriteUrl, idleStep)"
                alt=""
                class="podium-column__sprite"
            >
        </div>
        <div
            v-else
            class="podium-column__sprite-wrap"
        />

        <img
            :src="`/images/leaderboard/podium-${rank}.png`"
            alt=""
            class="podium-column__base"
        >
    </div>
</template>

<script setup lang="ts">
import type { LeaderboardEntryView } from '../../../composables/useLeaderboard';
import { idleFrameUrl } from '../../../utils/spriteDisplay';

defineProps<{
    entry: LeaderboardEntryView | null;
    rank: 1 | 2 | 3;
}>();

const idleStep = useIdleFrame();
</script>

<style scoped lang="scss">
.podium-column {
    min-width: 0;
    width: 100%;

    &__kills {
        color: #ffd166;
        text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.85);
    }

    &__sprite-wrap {
        width: 56px;
        height: 56px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        // 角色圖本身留了透明邊界，讓腳底疊到台面上（而非懸空浮在講台正上方）。
        margin-bottom: -5px;
        z-index: 1;
    }

    &__sprite {
        max-width: 100%;
        max-height: 100%;
        image-rendering: pixelated;
        filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4));
    }

    &__base {
        width: 100%;
        image-rendering: pixelated;
    }
}
</style>
