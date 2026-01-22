import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import {
    aliases, mdi, 
} from 'vuetify/iconsets/mdi';
import colors from 'vuetify/lib/util/colors.mjs';

export default defineNuxtPlugin({
    name: 'vuetify',
    setup(nuxtApp) {
        const vuetify = createVuetify({
            components,
            directives,
        
            // 字體配置
            defaults: { global: { style: 'font-family: "Source Sans 3", "Noto Sans TC", sans-serif;' } },
    
            // 主題配置
            theme: {
                defaultTheme: 'dark',
                themes: {
                    dark: {
                        dark: true,
                        colors: {
                            white: colors.grey.darken3,
                            primary: '#C4CBDB',
                            dark: '#4f5563',
                            lightgrey: colors.grey.darken1,
                            secondary: '#FCECDF',
                            warning: '#a05d5d',
                            background: '#212020',
                            success: colors.green.lighten2,
                            green: '#81b29a',
                        },
                    },
                },
            },
    
            // 圖標配置
            icons: {
                defaultSet: 'mdi',
                aliases,
                sets: { mdi },
            },
    
            // 顯示選項
            display: {
                mobileBreakpoint: 'sm',
                thresholds: {
                    xs: 0,
                    sm: 600,
                    md: 960,
                    lg: 1280,
                    xl: 1920,
                },
            },
        });

        nuxtApp.vueApp.use(vuetify);
    },
});