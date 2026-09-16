<template>
    <div
        class="character-stage__equip-col d-flex flex-column ga-3"
        :class="`character-stage__equip-col--${side}`"
    >
        <button
            v-for="(slot, index) in slots"
            :key="slot"
            type="button"
            class="equip-slot d-flex align-center justify-center pixel-press"
            :class="{ 'equip-slot--edge': index === 0 || index === 2 }"
            :style="slotStyle(slot)"
            :aria-label="slotLabel(slot)"
            @click="openDetail(slot)"
        >
            <span
                v-if="equippedItem(slot)"
                class="equip-slot__rarity font-pixel"
                :style="{ background: RARITY_COLOR[equippedItem(slot)!.rarity] }"
            >
                {{ equippedItem(slot)!.rarity }}
            </span>
            <GameCommonPixelIcon
                :name="slotIcon(slot)"
                :size="32"
                :class="{ 'equip-slot__icon--empty': !equippedItem(slot) }"
            />
            <span
                v-if="slotValue(slot)"
                class="equip-slot__value font-pixel"
                :style="{ color: slotValueColor(slot) }"
            >
                {{ slotValue(slot) }}
            </span>
        </button>
    </div>
</template>

<script setup lang="ts">
import type { EquipmentSlot } from '../../../../shared/types/common';
import {
    SLOT_PIXEL_ICON, SLOT_LABEL, RARITY_COLOR, resolvePixelIcon,
    equippedStatValue, equippedStatColor, type ItemLike,
} from '../../../utils/equipmentDisplay';

const props = defineProps<{
    slots: EquipmentSlot[];
    equipment: Partial<Record<EquipmentSlot, string>>;
    // eslint-disable-next-line no-unused-vars -- named param is required TS function-type syntax, not a real binding
    itemById: (itemId: string | undefined) => ItemLike | undefined;
    side: 'left' | 'right';
}>();

const emit = defineEmits<{
    select: [item: ItemLike];
}>();

const equippedItem = (slot: EquipmentSlot) => props.itemById(props.equipment[slot]);

const slotLabel = (slot: EquipmentSlot) => {
    const item = equippedItem(slot);
    return item ? `${SLOT_LABEL[slot]}：已裝備（${item.rarity}）` : `${SLOT_LABEL[slot]}：空`;
};

const slotStyle = (slot: EquipmentSlot) => {
    const item = equippedItem(slot);
    if (!item) {
        return { borderColor: 'rgba(196, 203, 219, 0.25)', background: '#14171c' };
    }
    return { borderColor: RARITY_COLOR[item.rarity], background: '#14171c' };
};

// Show the equipped item's own picture when the slot is filled, otherwise
// the generic placeholder for that slot.
const slotIcon = (slot: EquipmentSlot) => {
    const item = equippedItem(slot);
    return item ? resolvePixelIcon(item) : SLOT_PIXEL_ICON[slot];
};

const slotValue = (slot: EquipmentSlot) => equippedStatValue(equippedItem(slot));
const slotValueColor = (slot: EquipmentSlot) => equippedStatColor(equippedItem(slot));

const openDetail = (slot: EquipmentSlot) => {
    const item = equippedItem(slot);
    if (item) {
        emit('select', item);
    }
};
</script>

<style scoped lang="scss">
.character-stage__equip-col {
    &--left .equip-slot--edge {
        left: 14px;
    }

    &--right .equip-slot--edge {
        left: -14px;
    }
}

.equip-slot {
    position: relative;
    width: 48px;
    height: 48px;
    padding: 0;
    border: 2px solid rgba(196, 203, 219, 0.25);
    border-radius: 2px;
    background: #14171c;
    color: rgb(var(--v-theme-primary));
    cursor: pointer;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04), 0 2px 0 0 rgba(0, 0, 0, 0.5);
    transition: left 0.12s ease-out, transform 0.08s ease-out, background-color 0.08s ease-out;

    &__value {
        position: absolute;
        bottom: -9px;
        left: 50%;
        transform: translateX(-50%);
        padding: 0 3px;
        font-size: 9px;
        line-height: 1.3;
        background: #14171c;
        white-space: nowrap;
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

    &__icon--empty {
        opacity: 0.4;
    }
}
</style>
