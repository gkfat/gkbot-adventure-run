import { getServerConfig } from '../../../config/config';
import {
    getAdminFirestore, getFirebaseAdminApp, 
} from '../../utils/firebaseAdmin';

export default defineEventHandler(async () => {
    const db = getAdminFirestore();

    const serverConfig = getServerConfig();

    const diagnostics = {
        projectId: getFirebaseAdminApp().options.projectId ?? null,
        emulatorHost: serverConfig.firestoreEmulatorHost ?? null,
        nodeEnv: serverConfig.nodeEnv,
    };

    try {
        const collections = await db.listCollections();
  
        console.log({ collections });

        return {
            ok: true,
            ...diagnostics,
        };
    } catch (err) {
        const anyErr = err as {
            message?: string;
            code?: unknown;
            details?: unknown;
            metadata?: unknown;
        };

        return {
            ok: false,
            ...diagnostics,
            error: {
                message: anyErr?.message ?? String(err),
                code: anyErr?.code ?? null,
                details: anyErr?.details ?? null,
            },
            hint:
                'If code is NOT_FOUND, ensure the Firebase project has Firestore Database created (Firebase Console -> Firestore -> Create database) or set FIRESTORE_EMULATOR_HOST for local emulator.',
        };
    }
});
