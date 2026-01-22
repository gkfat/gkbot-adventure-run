export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: { enabled: true },
    modules: ['@nuxt/eslint', '@nuxt/image'],

    app: {
        head: {
            charset: 'utf-8',
            viewport: 'width=device-width, initial-scale=1',
            htmlAttrs: { lang: 'zh-TW' },
            link: [
                // Favicon
                {
                    rel: 'icon', type: 'image/x-icon', href: '/favicon.ico', 
                },
                {
                    rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png',
                },
                {
                    rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png',
                },
                // Apple Touch Icon
                {
                    rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png',
                },
                // Web App Manifest
                {
                    rel: 'manifest', href: '/site.webmanifest', 
                },
                // Fonts
                {
                    rel: 'preconnect', href: 'https://fonts.googleapis.com',
                },
                {
                    rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '',
                },
                {
                    rel: 'stylesheet', 
                    href: 'https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap',
                },
            ],
        },
    },

    // SPA mode for Vercel deployment
    ssr: false,

    css: [
        '@/assets/css/index.scss',
        'vuetify/lib/styles/main.sass',
        '@mdi/font/css/materialdesignicons.min.css',
    ],

    // Vercel deployment preset
    nitro: { preset: 'vercel' },

    /**
     * Env handling:
     * - Private runtimeConfig keys are server-only
     * - runtimeConfig.public keys are exposed to client bundle
     *
     * Nuxt automatically loads `.env`.
     */
    runtimeConfig: {
        // Server-only configuration
        firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
        firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
        
        // Public configuration (exposed to client)
        public: {
            firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || '',
            firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
            firebaseProjectId:
                process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID ||
                process.env.FIREBASE_PROJECT_ID ||
                '',
            firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
            firebaseMessagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
            firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || '',
        },
    },
    // @nuxt/image 配置
    image: {
        format: [
            'avif',
            'webp',
            'jpg',
        ],
        screens: {
            xs: 320,
            sm: 640,
            md: 768,
            lg: 1024,
            xl: 1280,
        },
        quality: 80,
        densities: [1, 2],
        providers: { static: { provider: 'ipx' } },
    },
});
