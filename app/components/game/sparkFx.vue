<template>
    <img
        :src="frameSrc"
        alt=""
    >
</template>

<script setup lang="ts">
import { SPARK_FRAME_MS, sparkFrameUrls } from '../../composables/useCombat';

// 播放揮砍受擊特效的影格序列(見 useCombat.ts sparkFrameUrls)：掛載時從第一格
// 開始，每 SPARK_FRAME_MS 前進一格，播到最後一格就停在原地，不循環——呼叫端
// 靠 :key 讓整個元件重新掛載才會重播(跟 cardFx/damageTextFx 同一套慣例)。
const props = defineProps<{ kind: 'hit' | 'crit' }>();

const frames = sparkFrameUrls(props.kind);
const frameIndex = ref(0);
const frameSrc = computed(() => frames[frameIndex.value]);

let timer: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
    timer = setInterval(() => {
        if (frameIndex.value < frames.length - 1) {
            frameIndex.value += 1;
        } else if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }, SPARK_FRAME_MS);
});
onUnmounted(() => {
    if (timer) clearInterval(timer);
});
</script>
