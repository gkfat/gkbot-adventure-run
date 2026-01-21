import {
    getApps, initializeApp, type App, cert,
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

/**
 * 取得 Firebase Admin 憑證
 * 優先順序：
 * 1. FIREBASE_SERVICE_ACCOUNT_KEY (JSON string in env) - for Vercel
 * 2. applicationDefault() - for local dev or GCP environments
 */
function getCredential() {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            return cert(serviceAccount);
        } catch (error) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error);
            throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format');
        }
    }
    
    // Fallback to applicationDefault for local dev or GCP
    return applicationDefault();
}

let app: App | null = null;
let db: Firestore | null = null;

export function getFirebaseAdminApp(): App {
    if (app) return app;
  
    if (!getApps().length) {
        const projectId = getProjectIdFromEnv();

        app = initializeApp({
            credential: getCredential(),
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
