<template>
    <NuxtLayout>
        <NuxtPage />
    </NuxtLayout>
</template>
<script lang="ts" setup>

// 全域 SEO 設定
useHead({
    titleTemplate: `%s | GkBot Adventure Run`,
    meta: [
        {
            name: 'description',
            content: '試著摧毀更多的 GkBot 機器人吧！',
        },
        {
            name: 'author',
            content: 'GK',
        },
        {
            property: 'og:type',
            content: 'website',
        },
        {
            property: 'og:locale',
            content: 'zh_TW',
        },
    ],
    link: [
        {
            rel: 'icon',
            type: 'image/x-icon',
            href: '/favicon.ico',
        },
    ],
});
</script>