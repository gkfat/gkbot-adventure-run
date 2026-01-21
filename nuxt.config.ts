export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: { enabled: true },
    modules: ['@nuxt/eslint', '@nuxt/image'],

    // SPA mode for Vercel deployment
    ssr: false,

    // Vercel deployment preset
    nitro: {
        preset: 'vercel',
    },

    /**
     * Env handling:
     * - Private runtimeConfig keys are server-only
     * - runtimeConfig.public keys are exposed to client bundle
     *
     * Nuxt automatically loads `.env`.
     */
    runtimeConfig: {
        firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
        firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
        public: {
            // Only expose values safe to be public.
            firebaseProjectId:
                process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID ||
                process.env.FIREBASE_PROJECT_ID ||
                '',
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
