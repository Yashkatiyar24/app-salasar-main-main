import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

// Prefer environment variables, but fall back to explicit config if provided.
const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyAJeaxnuunfjIW8AqR8HiaE_LOmKyTYHTs",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "salasar-hotel.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "salasar-hotel",
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "salasar-hotel.firebasestorage.app",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "474921163584",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "1:474921163584:web:d3c8eaf72bccd293dc38a5",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-ELE15YL9QZ",
  // Realtime Database URL
  // Prefer env override, but default to the project's RTDB endpoint so RTDB works out of the box.
  databaseURL:
    process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ??
    'https://salasar-2d54a-default-rtdb.firebaseio.com',
};

if (!firebaseConfig.apiKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing EXPO_PUBLIC_FIREBASE_API_KEY — check frontend/.env or your environment variables.'
  );
}

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export commonly used SDK services so other modules (AuthContext, etc.) can import them.
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// Realtime Database (optional)
export const rtdb = getDatabase(app);

// Initialize Analytics on web (try-catch because Analytics isn't available in native runtimes)
let analytics: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getAnalytics } = require('firebase/analytics');
  analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
} catch (e) {
  // Not critical — analytics may not be supported in the current runtime.
}

export { analytics };

// Runtime sanity check (browser only): validate API key by calling
// https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=API_KEY
// This helps surface CONFIGURATION_NOT_FOUND early with a clearer message.
if (typeof window !== 'undefined' && firebaseConfig.apiKey) {
  (async () => {
    try {
      const resp = await fetch(
        `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${encodeURIComponent(
          firebaseConfig.apiKey
        )}`
      );
      const json = await resp.json();
      if (!resp.ok) {
        // eslint-disable-next-line no-console
        console.warn('Firebase getProjectConfig returned non-OK:', resp.status, json);
        if (json && json.error && json.error.message === 'CONFIGURATION_NOT_FOUND') {
          // eslint-disable-next-line no-console
          console.error(
            'Firebase configuration not found for provided API key. Please verify the Web API Key and that a Web app exists in your Firebase project (Project settings → Your apps).' 
          );
        }
      } else {
        // eslint-disable-next-line no-console
        console.debug('Firebase getProjectConfig OK:', json);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug('Firebase getProjectConfig check failed (network or CORS):', e);
    }
  })();
}
