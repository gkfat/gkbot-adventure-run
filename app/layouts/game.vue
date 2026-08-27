<template>
    <v-app
        full-height
        :styles="{
            height,
            width
        }"
        class="bg-transparent overflow-hidden"
    >
        <div
            class="game-shell mx-auto d-flex flex-column"
            :style="{ width: '100%', maxWidth: '500px', height: '100%' }"
        >
            <GameHeader @open-drawer="drawerOpen = true" />
            <GameResourceBar />

            <main class="game-stage flex-grow-1">
                <slot />
            </main>

            <GameBottomNav />
        </div>

        <GameAccountDrawer v-model="drawerOpen" />

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
</script>

<style scoped lang="scss">
.game-shell {
    position: relative;
}

.game-stage {
    position: relative;
    overflow: hidden;
}
</style>
