<template>
    <v-app
        full-height
        :styles="{
            height,
            width
        }"
        class="bg-transparent overflow-hidden"
    >
        <v-main
            :style="{
                width: '100%',
                maxWidth: '500px'
            }"
            class="overflow-hidden mx-auto"
        >
            <v-container
                class="fill-height d-flex flex-column flex-nowrap overflow-y-auto"
                fluid
            >
                <slot />
            </v-container>
        </v-main>

        <BackgroundAnimation />
    </v-app>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify';
import BackgroundAnimation from '~/components/backgroundAnimation.vue';


const {
    height, width, 
} = useDisplay()
</script>
