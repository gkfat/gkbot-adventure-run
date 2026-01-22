/**
 * Server-only configuration
 * Contains sensitive data that should NEVER be exposed to client
 */
type ServerConfig = {
    /**
     * Server-only Firebase project id.
     * Prefer setting this explicitly to avoid accidentally using a wrong Firebase project.
     */
    firebaseProjectId?: string;

    /** When set, firebase-admin / firestore client should connect to emulator. */
    firestoreEmulatorHost?: string;

    nodeEnv: string;
};

/**
 * Public configuration - Safe to expose to client bundle
 * 
 * Note: Firebase client config (apiKey, authDomain, etc.) is designed to be public.
 * Real security is enforced by:
 * - Server-side token verification (Firebase Admin SDK)
 * - Firestore Security Rules
 * - Firebase Console: Authorized domains & App Check
 */
type PublicConfig = {
    /** Firebase Project ID */
    firebaseProjectId?: string;
    
    /** Firebase Client SDK Configuration */
    firebase: {
        /** 
         * Firebase API Key (public identifier, not a secret)
         * Safe to expose - real security is on server & Firestore rules
         */
        apiKey: string;
        /** Firebase Auth Domain (e.g., your-project.firebaseapp.com) */
        authDomain: string;
        /** Firebase Project ID */
        projectId: string;
        /** Firebase Storage Bucket */
        storageBucket: string;
        /** Firebase Messaging Sender ID */
        messagingSenderId: string;
        /** Firebase App ID */
        appId: string;
    };
};

/**
 * Get server-only configuration
 * @throws Error if called on client side
 */
export function getServerConfig(): ServerConfig {
    if (import.meta.client) {
        throw new Error('getServerConfig() must not be called on client.');
    }

    // In Nuxt/Nitro runtime this is available globally.
     
    const runtimeConfig = useRuntimeConfig();

    return {
        firebaseProjectId: runtimeConfig.firebaseProjectId || undefined,
        firestoreEmulatorHost: runtimeConfig.firestoreEmulatorHost || undefined,
        nodeEnv: process.env.NODE_ENV || 'development',
    };
}

/**
 * Get public configuration (safe for client use)
 * Can be called from both server and client
 */
export function getPublicConfig(): PublicConfig {
     
    const runtimeConfig = useRuntimeConfig();

    return {
        firebaseProjectId: runtimeConfig.public.firebaseProjectId || undefined,
        firebase: {
            apiKey: runtimeConfig.public.firebaseApiKey || '',
            authDomain: runtimeConfig.public.firebaseAuthDomain || '',
            projectId: runtimeConfig.public.firebaseProjectId || '',
            storageBucket: runtimeConfig.public.firebaseStorageBucket || '',
            messagingSenderId: runtimeConfig.public.firebaseMessagingSenderId || '',
            appId: runtimeConfig.public.firebaseAppId || '',
        },
    };
}
