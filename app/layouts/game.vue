<template>
    <v-app
        full-height
        :style="{
            height: `${height}px`,
            width: `${width}px`
        }"
        class="bg-transparent overflow-hidden"
    >
        <div
            class="game-shell mx-auto d-flex flex-column"
            :style="{ width: '100%', maxWidth: '500px', height: '100%' }"
        >
            <GameLayoutsHeader @open-drawer="drawerOpen = true" />
            <GameLayoutsResourceBar v-if="selectedCharacterId && !isAdventurePage" />

            <main class="game-stage flex-grow-1">
                <slot />
            </main>

            <GameLayoutsBottomNav v-if="selectedCharacterId && !isAdventurePage" />
        </div>

        <GameCommonAccountDrawer v-model="drawerOpen" />

        <BackgroundAnimation />
    </v-app>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify';
import BackgroundAnimation from '~/components/backgroundAnimation.vue';

const {
    height, width,
} = useDisplay();

const drawerOpen = ref(false);

// 選角/建立角色畫面（尚未選定角色）不顯示底部導覽列
const { selectedCharacterId } = useCharacter();

// 冒險進行中畫面版面吃緊，隱藏底部導覽列
const route = useRoute();
const isAdventurePage = computed(() => route.path === '/adventure');
</script>

<style scoped lang="scss">
.game-shell {
    position: relative;
}

.game-stage {
    position: relative;
    min-height: 0;
    overflow: hidden;
}
</style>
