import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { auth } from '../firebase/firebase';

const AUTH_UID_KEY = 'auth_user_uid';

/**
 * Listens to Firebase auth state and persists a minimal session marker.
 * Firebase still manages tokens internally; we just mirror the UID to SecureStore
 * so we can gate the UI quickly at startup.
 */
export function useAuthListener() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const sub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        await SecureStore.setItemAsync(AUTH_UID_KEY, fbUser.uid);
      } else {
        setUser(null);
        await SecureStore.deleteItemAsync(AUTH_UID_KEY);
      }
      setChecking(false);
    });
    return () => sub();
  }, []);

  return { user, checking };
}

export async function clearAuthMarker() {
  await SecureStore.deleteItemAsync(AUTH_UID_KEY);
}
