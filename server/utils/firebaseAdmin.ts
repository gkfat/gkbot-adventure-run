import {
    getApps, initializeApp, type App, 
} from 'firebase-admin/app';
import {
    getFirestore, type Firestore, 
} from 'firebase-admin/firestore';
import { applicationDefault } from 'firebase-admin/app';

import { getServerConfig } from '../../config/config';

function getProjectIdFromEnv(): string | undefined {
    const projectId =
    getServerConfig().firebaseProjectId ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT;

    return projectId || undefined;
}

let app: App | null = null;
let db: Firestore | null = null;

export function getFirebaseAdminApp(): App {
    if (app) return app;
  
    if (!getApps().length) {
        const projectId = getProjectIdFromEnv();

        app = initializeApp({
            credential: applicationDefault(),
            ...(projectId ? { projectId } : {}),
        });
    } else {
        app = getApps()[0] as App;
    }

    return app;
}

export function getAdminFirestore(): Firestore {
    if (db) return db;

    const app = getFirebaseAdminApp();
    db = getFirestore(app);

    return db;
}
