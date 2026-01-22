<template>
    <div />
</template>

<script setup lang="ts">
// 設定 SEO
useHead({
    title: '歡迎',
    meta: [
        {
            name: 'description',
            content: '試著摧毀更多的 GkBot 機器人吧！',
        },
    ],
});

navigateTo('/login');
</script>
