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

type PublicConfig = {
    /** Exposed to client bundle (ONLY set values safe to be public). */
    firebaseProjectId?: string;
};

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

export function getPublicConfig(): PublicConfig {
     
    const runtimeConfig = useRuntimeConfig();

    return { firebaseProjectId: runtimeConfig.public.firebaseProjectId || undefined };
}
