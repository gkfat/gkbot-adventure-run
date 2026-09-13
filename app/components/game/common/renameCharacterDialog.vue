<template>
    <GameCommonDialogFrame
        v-model="open"
        max-width="320"
        content-class="rename-character-dialog"
    >
        <div class="font-pixel text-subtitle-1 mb-3" style="color: rgb(var(--v-theme-primary));">
            修改暱稱
        </div>

        <v-text-field
            v-model="nickname"
            density="compact"
            variant="outlined"
            maxlength="20"
            counter
            hide-details="auto"
            class="mb-3"
            @keydown.enter="handleRename"
        />

        <div class="d-flex align-center ga-1 mb-3">
            <template v-if="hasRenamed">
                <GameCommonCurrencyIcon type="GEMS" />
                <span class="font-pixel text-body-2">{{ RENAME_COST_GEMS }}</span>
                <span
                    v-if="!canAfford"
                    class="text-caption ml-2"
                    style="color: rgb(var(--v-theme-warning));"
                >
                    寶石不足
                </span>
            </template>
            <span
                v-else
                class="text-caption text-medium-emphasis"
            >
                首次修改免費
            </span>
        </div>

        <div
            v-if="renameError"
            class="text-body-2 mb-3"
            style="color: rgb(var(--v-theme-warning));"
        >
            {{ renameError }}
        </div>

        <SystemBtn
            block
            variant="flat"
            color="primary"
            class="text-none mb-2"
            :loading="renaming"
            :disabled="!canSubmit"
            @click="handleRename"
        >
            確認修改
        </SystemBtn>
        <SystemBtn
            block
            variant="outlined"
            color="primary"
            class="text-none"
            :disabled="renaming"
            @click="open = false"
        >
            取消
        </SystemBtn>
    </GameCommonDialogFrame>
</template>

<script setup lang="ts">
import { RENAME_COST_GEMS } from '../../../composables/useCharacter';

const {
    character, renameCharacter,
} = useCharacter();

const open = ref(false);
const nickname = ref('');
const renaming = ref(false);
const renameError = ref<string | null>(null);

const hasRenamed = computed(() => character.value?.hasRenamed ?? false);
const canAfford = computed(() => (character.value?.gems ?? 0) >= RENAME_COST_GEMS);

const canSubmit = computed(() => (
    nickname.value.trim().length > 0
    && nickname.value !== character.value?.nickname
    && (!hasRenamed.value || canAfford.value)
));

const handleRename = async () => {
    if (!canSubmit.value) return;

    renaming.value = true;
    renameError.value = null;

    try {
        await renameCharacter(nickname.value.trim());
        open.value = false;
    } catch (err: unknown) {
        renameError.value = err instanceof Error ? err.message : '修改暱稱失敗';
    } finally {
        renaming.value = false;
    }
};

defineExpose({
    open: () => {
        renameError.value = null;
        nickname.value = character.value?.nickname ?? '';
        open.value = true;
    },
});
</script>
