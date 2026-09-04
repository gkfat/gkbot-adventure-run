<template>
    <v-dialog
        :model-value="modelValue"
        :max-width="maxWidth"
        :persistent="persistent"
        :scrim="scrim"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <div
            class="game-dialog-frame pa-4"
            :class="contentClass"
        >
            <slot />
        </div>
    </v-dialog>
</template>

<script setup lang="ts">
// 共用的 dialog 內容框：深色背景 + 細邊框，冒險流程與商店/角色管理的 dialog、
// banner 全部共用同一套視覺語言（原本每個元件各自複製一份 background/border，
// 見 git history）。個別元件透過 contentClass 疊加自己的版面/顏色差異
// （例如 flex 排版、position: relative、子選擇器樣式），frame 本身只負責外框。
//
// scrim 預設維持 Vuetify 原生預設值 true；冒險流程裡「結果需要玩家自己按
// 底部固定按鈕才能繼續」的 dialog 必須明確傳 :scrim="false"（動態綁定，不能寫
// 成 scrim="false" 靜態字串，字串 "false" 是 truthy，rendered scrim 依然會
// 攔截點擊——見使用者回報 #3），frame 統一在這裡轉發，避免每個消費者各自重踩
// 同一個坑。
withDefaults(defineProps<{
    modelValue: boolean;
    maxWidth?: string | number;
    persistent?: boolean;
    scrim?: boolean;
    contentClass?: string;
}>(), {
    maxWidth: 360,
    persistent: false,
    scrim: true,
    contentClass: '',
});

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<style scoped lang="scss">
.game-dialog-frame {
    background: rgb(var(--v-theme-background));
    border: 1px solid rgba(196, 203, 219, 0.15);
}
</style>
