<template>
    <GameCommonDialogFrame
        v-model="open"
        :max-width="equippedInSlot ? 560 : 320"
        content-class="item-detail-dialog"
    >
        <template v-if="item && detailInfo">
            <div
                v-if="item.equipSlot"
                class="d-flex justify-end mb-1"
            >
                <span class="text-caption text-medium-emphasis font-pixel">{{ SLOT_LABEL[item.equipSlot] }}</span>
            </div>

            <v-row
                v-if="equippedInSlot && equippedDetailInfo"
                class="item-detail-dialog__compare mb-3"
                dense
            >
                <v-col
                    cols="12"
                    sm="6"
                    class="item-detail-dialog__compare-column item-detail-dialog__compare-column--current"
                >
                    <div class="text-caption text-medium-emphasis mb-1">目前裝備</div>

                    <GameCommonItemDetailPanel
                        :item="equippedInSlot"
                        :name="equippedDetailInfo.name"
                        :effects="equippedDetailInfo.effects"
                        :flavor="equippedDetailInfo.flavor"
                        :show-flavor="false"
                        :show-slot-label="false"
                        compact
                    />
                </v-col>

                <v-col
                    cols="12"
                    sm="6"
                    class="item-detail-dialog__compare-column"
                >
                    <div class="text-caption text-medium-emphasis mb-1">目標裝備</div>
                    <GameCommonItemDetailPanel
                        :item="item"
                        :name="detailInfo.name"
                        :effects="detailInfo.effects"
                        :flavor="detailInfo.flavor"
                        :show-slot-label="false"
                    />
                </v-col>
            </v-row>

            <GameCommonItemDetailPanel
                v-else
                :item="item"
                :name="detailInfo.name"
                :effects="detailInfo.effects"
                :flavor="detailInfo.flavor"
                :show-slot-label="false"
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
    describeItem, pickCompareSlot, pickTargetSlot, SLOT_LABEL, type ItemLike,
} from '../../../utils/equipmentDisplay';
import type { EquipmentSlot } from '../../../../shared/types/common';

const {
    character, equipItem, unequipItem,
} = useCharacter();
const {
    sellItem, sellLoading, sellError, itemById,
} = useInventory();
const { playSfx } = useAudio();

const open = ref(false);
const item = ref<ItemLike & { itemId: string; sellPriceGold: number } | null>(null);
const detailInfo = computed(() => (item.value ? describeItem(item.value) : null));

const isEquipped = (target: { itemId: string }) => (
    Object.values(character.value?.equipment ?? {}).includes(target.itemId)
);

// 若正在檢視的道具有裝備欄位、目前「不是」裝備中的道具本身，且該欄位已裝備
// 其他道具，於 header 顯示該道具供比較；正在檢視的道具已經裝備中時，沒有
// 「換裝」的意義，不顯示比較欄位（pickCompareSlot 對雙手武器的 fallback
// 邏輯只認 equipSlot/兩手是否有空位，不知道 item 本身是否已裝備在另一手）。
const equippedInSlot = computed(() => {
    if (!item.value?.equipSlot || isEquipped(item.value)) return undefined;
    const compareSlot = pickCompareSlot(item.value, character.value?.equipment ?? {});
    if (!compareSlot) return undefined;
    const equippedItemId = character.value?.equipment?.[compareSlot];
    if (!equippedItemId || equippedItemId === item.value.itemId) return undefined;
    return itemById(equippedItemId);
});
const equippedDetailInfo = computed(() => (equippedInSlot.value ? describeItem(equippedInSlot.value) : null));

const equipActionLoading = ref(false);
const equipActionError = ref<string | null>(null);

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
        playSfx('equip.wav');
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
        playSfx('equip.wav');
        open.value = false;
    } else {
        equipActionError.value = '卸下失敗，請稍後再試';
    }
};

const handleSell = async (target: ItemLike & { itemId: string; sellPriceGold: number }) => {
    const goldEarned = await sellItem(target.itemId);
    if (goldEarned !== null) {
        playSfx('gold.mp3');
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

    &__compare-column--current {
        border: 2px solid rgba(196, 203, 219, 0.25);
        border-radius: 4px;
        padding: 14px;
    }
}
</style>

<style lang="scss">
// 比較模式（雙欄堆疊）內容變高，手機直式螢幕可能超出視窗高度；GameCommonDialogFrame
// 本身不提供捲動（見 dialogFrame.vue），這裡讓 dialog 內容自己可以垂直捲動，
// 避免下方的裝備/出售/關閉按鈕被截斷、完全點不到。跨元件邊界故不能用 scoped
// class（見 dialogFrame.vue 同樣模式的 .game-dialog-frame--contained-fullscreen）。
.game-dialog-frame.item-detail-dialog {
    max-height: 80vh;
    overflow-y: auto;
}
</style>
