<template>
    <v-dialog
        v-model="open"
        max-width="300"
    >
        <div
            v-if="item"
            class="item-detail pa-4"
        >
            <div
                v-if="item.equipSlot"
                class="item-detail__slot-label text-caption text-medium-emphasis font-pixel"
            >
                {{ SLOT_LABEL[item.equipSlot] }}
            </div>

            <div class="d-flex align-center ga-3 mb-3">
                <div
                    class="pixel-slot pixel-slot--item pixel-slot--detail"
                    :style="{ borderColor: RARITY_COLOR[item.rarity] }"
                >
                    <span
                        class="pixel-slot__rarity font-pixel"
                        :style="{ background: RARITY_COLOR[item.rarity] }"
                    >
                        {{ item.rarity }}
                    </span>
                    <GamePixelIcon
                        :name="resolvePixelIcon(item)"
                        :size="40"
                    />
                </div>
                <div>
                    <div
                        class="font-pixel text-subtitle-1"
                        :style="{ color: RARITY_COLOR[item.rarity] }"
                    >
                        {{ detailInfo?.name }}
                    </div>
                    <div class="text-caption text-medium-emphasis mb-1">
                        稀有度 {{ item.rarity }}
                    </div>
                    <div class="text-body-2">
                        {{ detailInfo?.effectText }}
                    </div>
                </div>
            </div>

            <p class="text-body-2 text-medium-emphasis mb-3">
                {{ detailInfo?.flavor }}
            </p>

            <div
                v-if="isEquipped(item)"
                class="item-detail__equipped-tag text-caption font-pixel mb-3"
            >
                <v-icon
                    icon="mdi-check-bold"
                    size="12"
                    class="mr-1"
                />
                裝備中
            </div>

            <div
                v-if="equipActionError || sellError"
                class="text-body-2 mb-3"
                style="color: rgb(var(--v-theme-warning));"
            >
                {{ equipActionError || sellError }}
            </div>

            <SystemBtn
                v-if="item.type === 'EQUIPMENT'"
                block
                variant="flat"
                :color="isEquipped(item) ? 'warning' : 'primary'"
                class="text-none mb-2"
                :loading="equipActionLoading"
                @click="isEquipped(item) ? handleUnequip(item) : handleEquip(item)"
            >
                {{ isEquipped(item) ? '卸下' : '裝備' }}
            </SystemBtn>

            <SystemBtn
                v-if="!isEquipped(item)"
                block
                variant="outlined"
                color="warning"
                class="text-none mb-2"
                :loading="sellLoading"
                @click="handleSell(item)"
            >
                出售(+{{ item.sellPriceGold }}金幣)
            </SystemBtn>

            <SystemBtn
                block
                variant="outlined"
                color="primary"
                class="text-none"
                @click="open = false"
            >
                關閉
            </SystemBtn>
        </div>

        <v-snackbar
            v-model="soldSnackbar"
            timeout="1600"
            location="top"
            color="dark"
        >
            {{ soldSnackbarText }}
        </v-snackbar>
    </v-dialog>
</template>

<script setup lang="ts">
import {
    RARITY_COLOR, SLOT_LABEL, resolvePixelIcon, describeItem, pickTargetSlot, type ItemLike,
} from '../../utils/equipmentDisplay';
import type { EquipmentSlot } from '../../../shared/types/common';

const {
    character, equipItem, unequipItem,
} = useCharacter();
const {
    sellItem, sellLoading, sellError,
} = useInventory();

const open = ref(false);
const item = ref<ItemLike & { itemId: string; sellPriceGold: number } | null>(null);
const detailInfo = computed(() => (item.value ? describeItem(item.value) : null));

const equipActionLoading = ref(false);
const equipActionError = ref<string | null>(null);

const soldSnackbar = ref(false);
const soldSnackbarText = ref('');

const isEquipped = (target: { itemId: string }) => (
    Object.values(character.value?.equipment ?? {}).includes(target.itemId)
);

const findEquippedSlot = (target: { itemId: string }): EquipmentSlot | undefined => {
    const entry = Object.entries(character.value?.equipment ?? {}).find(([, id]) => id === target.itemId);
    return entry?.[0] as EquipmentSlot | undefined;
};

const handleEquip = async (target: ItemLike & { itemId: string; sellPriceGold: number }) => {
    equipActionLoading.value = true;
    equipActionError.value = null;

    const slot = pickTargetSlot(target, character.value?.equipment ?? {});
    const success = await equipItem(target.itemId, slot);

    equipActionLoading.value = false;
    if (success) {
        open.value = false;
    } else {
        equipActionError.value = '裝備失敗，請稍後再試';
    }
};

const handleUnequip = async (target: ItemLike & { itemId: string; sellPriceGold: number }) => {
    const slot = findEquippedSlot(target);
    if (!slot) return;

    equipActionLoading.value = true;
    equipActionError.value = null;

    const success = await unequipItem(slot);

    equipActionLoading.value = false;
    if (success) {
        open.value = false;
    } else {
        equipActionError.value = '卸下失敗，請稍後再試';
    }
};

const handleSell = async (target: ItemLike & { itemId: string; sellPriceGold: number }) => {
    const goldEarned = await sellItem(target.itemId);
    if (goldEarned !== null) {
        open.value = false;
        soldSnackbarText.value = `已販售，獲得 ${goldEarned} 金幣`;
        soldSnackbar.value = true;
    }
};

defineExpose({
    open: (target: ItemLike & { itemId: string; sellPriceGold: number }) => {
        item.value = target;
        equipActionError.value = null;
        open.value = true;
    },
});
</script>

<style scoped lang="scss">
.pixel-slot {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(196, 203, 219, 0.25);
    border-radius: 3px;
    background: #14171c;
    color: rgb(var(--v-theme-primary));
    box-shadow:
        inset 2px 2px 0 rgba(255, 255, 255, 0.06),
        inset -2px -2px 0 rgba(0, 0, 0, 0.55);

    &::before,
    &::after {
        content: '';
        position: absolute;
        width: 6px;
        height: 6px;
        pointer-events: none;
        opacity: 0.55;
    }

    &::before {
        top: -2px;
        left: -2px;
        border-top: 2px solid rgb(var(--v-theme-primary));
        border-left: 2px solid rgb(var(--v-theme-primary));
    }

    &::after {
        bottom: -2px;
        right: -2px;
        border-bottom: 2px solid rgb(var(--v-theme-primary));
        border-right: 2px solid rgb(var(--v-theme-primary));
    }

    &--detail {
        width: 64px;
        height: 64px;
        flex: 0 0 auto;
    }

    &__rarity {
        position: absolute;
        top: -6px;
        left: -6px;
        padding: 0 2px;
        font-size: 7px;
        line-height: 1.4;
        color: #14171c;
        border-radius: 2px;
        white-space: nowrap;
    }
}

.item-detail {
    position: relative;
    background: rgb(var(--v-theme-background));
    border: 1px solid rgba(196, 203, 219, 0.15);

    &__slot-label {
        position: absolute;
        top: 16px;
        right: 16px;
    }

    &__equipped-tag {
        display: inline-flex;
        align-items: center;
        color: rgb(var(--v-theme-green));
    }
}
</style>
