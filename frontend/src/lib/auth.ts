import { auth } from '../firebase/firebase';
import {
  Auth,
  browserSessionPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';

let persistenceSet = false;
let unloadRegistered = false;

export const ensureSessionPersistence = async () => {
  // Only applies to web/tab environments.
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;
  if (persistenceSet) return;
  try {
    await setPersistence(auth, browserSessionPersistence);
    persistenceSet = true;
  } catch (err) {
    console.warn('Failed to set session persistence; continuing with default.', err);
  }
};

const registerUnloadSignOut = (authInstance: Auth) => {
  if (typeof window === 'undefined' || unloadRegistered) return;
  const handler = async () => {
    try {
      await firebaseSignOut(authInstance);
    } catch (err) {
      // best-effort; ignore failures on unload
    }
  };
  // Use both events to cover modern browsers and iOS Safari pagehide
  window.addEventListener('beforeunload', handler);
  window.addEventListener('pagehide', handler);
  unloadRegistered = true;
};

export const loginWithEmail = async (email: string, password: string) => {
  await ensureSessionPersistence();
  registerUnloadSignOut(auth);
  return signInWithEmailAndPassword(auth, email, password);
};

export const signOut = async () => firebaseSignOut(auth);

// Register unload hook immediately in case the user is already signed in via persistence
if (typeof window !== 'undefined') {
  registerUnloadSignOut(auth);
}
