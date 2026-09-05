<template>
    <GameCommonDialogFrame
        v-model="open"
        max-width="320"
        content-class="item-detail-dialog"
    >
        <template v-if="item && detailInfo">
            <GameCommonItemDetailPanel
                :item="item"
                :name="detailInfo.name"
                :effects="detailInfo.effects"
                :flavor="detailInfo.flavor"
            />

            <div
                v-if="isEquipped(item)"
                class="item-detail-dialog__equipped-tag text-caption font-pixel mb-3"
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
        </template>
    </GameCommonDialogFrame>
</template>

<script setup lang="ts">
import {
    describeItem, pickTargetSlot, type ItemLike,
} from '../../../utils/equipmentDisplay';
import type { EquipmentSlot } from '../../../../shared/types/common';

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
.item-detail-dialog {
    &__equipped-tag {
        display: inline-flex;
        align-items: center;
        color: rgb(var(--v-theme-green));
    }
}
</style>
