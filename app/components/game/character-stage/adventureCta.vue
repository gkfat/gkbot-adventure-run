<template>
    <div class="w-100 character-stage__footer">
        <!-- 中斷中的冒險：顯示上次斷掉的位置 -->
        <div
            v-if="interruptedRunLabel"
            class="text-caption text-medium-emphasis character-stage__interrupted-run"
        >
            上次探索中斷於：{{ interruptedRunLabel }}
        </div>
        <div class="d-flex ga-2">
            <div style="flex: 1;">
                <SystemBtn
                    block
                    size="x-large"
                    variant="flat"
                    color="primary"
                    class="text-none mx-auto character-stage__adventure-cta"
                    :loading="loading"
                    @click="emit('start')"
                >
                    <span class="d-flex flex-column">
                        <span
                            v-if="levelProgress"
                            class="text-caption font-weight-regular character-stage__adventure-cta-progress"
                        >
                            {{ levelProgress.stageName }} - {{ levelProgress.levelIndex }}/{{ levelProgress.levelTotal }}
                        </span>
                        <span>{{ label }}</span>
                    </span>
                </SystemBtn>
            </div>
            <!-- 放棄探索：僅在有進行中的 run 時顯示，與「繼續探索」同列、各佔一半寬度 -->
            <div
                v-if="showAbandon"
                style="flex: 1;"
            >
                <SystemBtn
                    block
                    color="error"
                    size="x-large"
                    class="text-none mx-auto"
                    :loading="loading"
                    @click="emit('abandon')"
                >
                    <span class="d-flex flex-column">
                        放棄探索
                    </span>
                </SystemBtn>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    label: string;
    levelProgress: { stageName: string; levelIndex: number; levelTotal: number } | null;
    loading: boolean;
    showAbandon: boolean;
    interruptedRunLabel: string | null;
}>();

const emit = defineEmits<{
    start: [];
    abandon: [];
}>();
</script>

<style scoped lang="scss">
.character-stage__footer {
    flex-shrink: 0;
}
</style>
