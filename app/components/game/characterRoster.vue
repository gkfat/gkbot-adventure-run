<template>
    <div class="character-roster d-flex flex-column align-center fill-height pa-4">
        <div class="font-pixel text-caption mb-4" style="color: rgb(var(--v-theme-primary)); opacity: 0.85;">
            選擇角色
        </div>

        <div class="character-roster__list">
            <div
                v-for="entry in roster"
                :key="entry.characterId"
                class="character-roster__row"
            >
                <button
                    type="button"
                    class="character-roster__entry pixel-press"
                    @click="handleSelect(entry.characterId)"
                >
                    <img
                        :src="entry.spriteUrl"
                        :alt="entry.className"
                        width="48"
                        height="48"
                        class="character-roster__sprite"
                    >
                    <div class="character-roster__info">
                        <div class="d-flex align-center ga-2">
                            <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-green));">
                                LV {{ entry.level }}
                            </span>
                            <span class="text-caption text-medium-emphasis">{{ entry.className }}</span>
                        </div>
                        <div class="d-flex align-center ga-3 mt-1">
                            <div class="d-flex align-center ga-1">
                                <GameCurrencyIcon
                                    type="GOLD"
                                    :size="12"
                                />
                                <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-secondary));">
                                    {{ entry.gold }}
                                </span>
                            </div>
                            <div class="d-flex align-center ga-1">
                                <GameCurrencyIcon
                                    type="GEMS"
                                    :size="12"
                                />
                                <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-primary));">
                                    {{ entry.gems }}
                                </span>
                            </div>
                        </div>
                    </div>
                    <v-icon
                        icon="mdi-chevron-right"
                        size="20"
                        color="primary"
                    />
                </button>

                <button
                    type="button"
                    class="character-roster__delete pixel-press"
                    aria-label="刪除角色"
                    @click.stop="openDeleteDialog(entry.characterId)"
                >
                    <v-icon
                        icon="mdi-trash-can-outline"
                        size="18"
                        color="warning"
                    />
                </button>
            </div>
        </div>

        <SystemBtn
            block
            variant="outlined"
            color="primary"
            class="text-none mt-4 flex-grow-0"
            prepend-icon="mdi-plus"
            :disabled="rosterFull"
            @click="$emit('create')"
        >
            {{ rosterFull ? `角色已達上限 (${roster.length}/3)` : `新建角色 (${roster.length}/3)` }}
        </SystemBtn>

        <GameDeleteCharacterDialog ref="deleteDialogRef" />
    </div>
</template>

<script setup lang="ts">
defineEmits<{ create: [] }>();

const {
    roster, rosterFull, selectCharacter,
} = useCharacter();

const handleSelect = (characterId: string) => {
    selectCharacter(characterId);
};

// eslint-disable-next-line no-unused-vars -- named param is required TS function-type syntax, not a real binding
type DeleteCharacterDialog = { open: (characterId: string) => void };
const deleteDialogRef = ref<DeleteCharacterDialog | null>(null);

const openDeleteDialog = (characterId: string) => {
    deleteDialogRef.value?.open(characterId);
};
</script>

<style scoped lang="scss">
.character-roster {
    width: 100%;
    overflow-y: auto;

    &__list {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    &__row {
        display: flex;
        align-items: stretch;
        gap: 8px;
    }

    &__entry {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1 1 auto;
        min-width: 0;
        padding: 10px 12px;
        background: rgba(196, 203, 219, 0.05);
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;
        cursor: pointer;
        text-align: left;

        &:hover {
            background: rgba(196, 203, 219, 0.1);
        }

        &:active {
            background: rgba(196, 203, 219, 0.16);
        }

        &:focus-visible {
            outline: 2px solid rgb(var(--v-theme-primary));
            outline-offset: 2px;
        }
    }

    &__delete {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 44px;
        background: rgba(196, 203, 219, 0.05);
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;
        cursor: pointer;

        &:hover {
            background: rgba(255, 82, 82, 0.1);
        }

        &:active {
            background: rgba(255, 82, 82, 0.16);
        }

        &:focus-visible {
            outline: 2px solid rgb(var(--v-theme-warning));
            outline-offset: 2px;
        }
    }

    &__sprite {
        image-rendering: pixelated;
        flex: 0 0 auto;
    }

    &__info {
        flex: 1 1 auto;
        min-width: 0;
    }
}
</style>
