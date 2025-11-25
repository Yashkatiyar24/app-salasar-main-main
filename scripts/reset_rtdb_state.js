/**
 * Reset RTDB data to a clean state:
 * - Clears all bookings and customers.
 * - Marks every existing room as available (is_available=true, status='available', current_booking_id=null).
 *
 * Usage: from repo root run `node scripts/reset_rtdb_state.js`
 * Optionally set env vars to override Firebase config (EXPO_PUBLIC_FIREBASE_*).
 */

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, update } = require('firebase/database');

const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??
    'AIzaSyAJeaxnuunfjIW8AqR8HiaE_LOmKyTYHTs',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'salasar-hotel.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'salasar-hotel',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'salasar-hotel.firebasestorage.app',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '474921163584',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '1:474921163584:web:d3c8eaf72bccd293dc38a5',
  databaseURL:
    process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ??
    'https://salasar-2d54a-default-rtdb.firebaseio.com',
};

async function reset() {
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  const roomsSnap = await get(ref(db, 'rooms'));
  const roomsVal = roomsSnap.exists() ? roomsSnap.val() || {} : {};

  const updates = {
    bookings: null, // delete bookings tree
    customers: null, // delete customers tree
  };

  const now = Date.now();
  for (const key of Object.keys(roomsVal)) {
    updates[`rooms/${key}/is_available`] = true;
    updates[`rooms/${key}/status`] = 'available';
    updates[`rooms/${key}/current_booking_id`] = null;
    updates[`rooms/${key}/updatedAt`] = now;
  }

  await update(ref(db), updates);
  console.log(
    `Reset complete. Rooms marked available: ${Object.keys(roomsVal).length}. Bookings/customers cleared.`
  );
}

reset().catch((err) => {
  console.error('Reset failed', err);
  process.exit(1);
});
