import {
    initializeApp, type FirebaseApp, 
} from 'firebase/app';
import {
    getAuth, type Auth, 
} from 'firebase/auth';
import { getPublicConfig } from '../../config/config';

/**
 * Firebase Client SDK 初始化
 * 僅在 client-side 執行
 * 
 * 使用統一的 config/config.ts 管理環境變數
 */
export default defineNuxtPlugin(() => {
    // 從統一的 config 取得設定
    const config = getPublicConfig();
    const firebaseConfig = config.firebase;

    // 檢查必要欄位
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.error('[Firebase] Missing required configuration. Please check your environment variables.');
        console.error('[Firebase] Required: NUXT_PUBLIC_FIREBASE_API_KEY and NUXT_PUBLIC_FIREBASE_PROJECT_ID');
        throw new Error('Firebase Client init failed');
    }

    // 初始化 Firebase
    let app: FirebaseApp;
    let auth: Auth;

    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        
        // 設定語言為繁體中文
        auth.languageCode = 'zh-TW';

        console.log('[Firebase] Client SDK initialized successfully');
        console.log('[Firebase] Project:', firebaseConfig.projectId);
    } catch (error) {
        console.error('[Firebase] Initialization failed:', error);
        throw new Error('Firebase Client init failed');
    }

    return {
        provide: {
            firebaseApp: app,
            firebaseAuth: auth,
        },
    };
});
