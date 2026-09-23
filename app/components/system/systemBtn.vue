<template>
    <v-btn
        v-bind="{
            ...buttonProps,
            ...$attrs,
        }"
        :class="[
            'text-none opacity-100 pixel-btn',
            props.size === 'default' ? 'pa-7' : '',
            $attrs.class,
        ]"
        @click="handleClick"
    >
        <slot />
    </v-btn>
</template>

<script setup lang="ts">
import type { VBtn } from 'vuetify/components';

interface Props {
    // 自訂樣式相關
    variant?: VBtn['$props']['variant'];
    color?: VBtn['$props']['color'];
    size?: VBtn['$props']['size'];
    rounded?: VBtn['$props']['rounded'];
    elevation?: VBtn['$props']['elevation'];
    
    // 狀態相關
    disabled?: VBtn['$props']['disabled'];
    loading?: VBtn['$props']['loading'];
    
    // 其他常用 props
    block?: VBtn['$props']['block'];
    href?: VBtn['$props']['href'];
    to?: VBtn['$props']['to'];
    type?: VBtn['$props']['type'];
    icon?: VBtn['$props']['icon'];
    prependIcon?: VBtn['$props']['prependIcon'];
    appendIcon?: VBtn['$props']['appendIcon'];
    
    // 允許傳入任何其他 Vuetify button props
    [key: string]: any;
}

const props = withDefaults(defineProps<Props>(), {
    // 預設樣式
    variant: 'flat',
    size: 'default',
    rounded: 'lg',
    
    // 預設狀態
    disabled: false,
    loading: false,
    block: false,
});

// 禁用自動 attribute 繼承，因為我們要手動處理
defineOptions({
    inheritAttrs: false,
});

// 聲明事件
const emit = defineEmits<{
    click: [event: MouseEvent];
}>();

const { playSfx } = useAudio();

// 處理點擊事件並轉發；點擊音效統一放在這個共用按鈕元件，讓遊戲內所有透過
// SystemBtn 的按鈕都有一致的點擊回饋（各按鈕自己的結果音效，例如裝備/升級，
// 仍各自在成功分支另外播放，兩者會疊在一起而非互相取代）。
const handleClick = (event: MouseEvent) => {
    if (!props.disabled && !props.loading) {
        playSfx('click.wav');
    }
    emit('click', event);
};

// 組合所有 props 傳遞給 v-btn
const buttonProps = computed(() => {
    return {
        variant: props.variant,
        color: props.color,
        size: props.size,
        rounded: props.rounded,
        elevation: props.elevation,
        disabled: props.disabled,
        loading: props.loading,
        block: props.block,
        href: props.href,
        to: props.to,
        type: props.type,
        icon: props.icon,
        prependIcon: props.prependIcon,
        appendIcon: props.appendIcon,
        // 將其他所有 props 也傳遞過去
        ...Object.keys(props)
            .filter(key => ![
                'variant', 'color', 'size', 'rounded', 'elevation',
                'disabled', 'loading', 'block', 'href', 'to', 'type',
                'icon', 'prependIcon', 'appendIcon',
            ].includes(key))
            .reduce((acc, key) => {
                acc[key] = props[key];
                return acc;
            }, {} as Record<string, any>),
    };
});
</script>

