<template>
    <GameCharacterStage />
</template>

<script setup lang="ts">
// 保護此頁面，需要登入
definePageMeta({
    middleware: ['auth'],
    layout: 'game',
});

// 設定 SEO
useHead({
    title: '主頁',
    meta: [
        {
            name: 'description',
            content: 'GkBot Adventure Run 遊戲主頁',
        },
    ],
});
</script>
