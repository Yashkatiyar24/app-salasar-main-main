// Smoke test against the project's RTDB endpoint
// This script will:
// 1) Find an available room under /rooms
// 2) Create customer under /customers
// 3) Create booking under /bookings and mark room occupied under /rooms/<key>
// 4) Read and print affected nodes
// 5) Perform checkout: update booking status and free the room
// 6) Read and print affected nodes after checkout

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, push, set, update } = require('firebase/database');

// Use the same defaults as frontend/src/firebase/config.ts
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAJeaxnuunfjIW8AqR8HiaE_LOmKyTYHTs',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'salasar-hotel.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'salasar-hotel',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'salasar-hotel.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '474921163584',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:474921163584:web:d3c8eaf72bccd293dc38a5',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-ELE15YL9QZ',
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || 'https://salasar-2d54a-default-rtdb.firebaseio.com',
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);

async function run() {
  console.log('Starting smoke test against RTDB:', firebaseConfig.databaseURL);

  // 1) Find first available room
  const roomsSnap = await get(ref(rtdb, 'rooms'));
  const roomsVal = roomsSnap.exists() ? roomsSnap.val() : {};
  const roomEntry = Object.entries(roomsVal).find(([, r]) => (r.is_available === undefined ? true : !!r.is_available));
  let createdTestRoomKey = null;
  let roomKey = roomEntry ? roomEntry[0] : null;
  let roomObj = roomEntry ? roomEntry[1] : null;

  if (!roomEntry) {
    // Create a temporary test room so we can run the smoke test safely.
    const testRoomsRef = ref(rtdb, 'rooms');
    const newRoomRef = push(testRoomsRef);
    const tempRoomNo = 900 + Math.floor(Math.random() * 90);
    const now = Date.now();
    const roomPayload = {
      room_no: tempRoomNo,
      beds: 1,
      type: 'Test',
      remarks: 'Temporary smoke-test room',
      is_available: true,
      status: 'available',
      createdAt: now,
      updatedAt: now,
    };
    await set(newRoomRef, roomPayload);
    createdTestRoomKey = newRoomRef.key;
    roomKey = createdTestRoomKey;
    roomObj = roomPayload;
    console.log('Created temporary test room:', roomKey, 'room_no:', tempRoomNo);
  }
  console.log('Selected room key:', roomKey, 'room_no:', roomObj.room_no);

  // Snapshot before
  const beforeRoom = (await get(ref(rtdb, `rooms/${roomKey}`))).val();
  console.log('Before room snapshot:', JSON.stringify(beforeRoom, null, 2));

  // 2) Create customer
  const customersRef = ref(rtdb, 'customers');
  const newCustomerRef = push(customersRef);
  const now = Date.now();
  await set(newCustomerRef, {
    guestName: 'Smoke Test Guest',
    phone: '0000000000',
    mobileNumber: '0000000000',
    name: 'Smoke Test Guest',
    idNumber: 'SMOKE123',
    checkInDate: new Date().toISOString(),
    checkOutDate: new Date(Date.now() + 24*3600*1000).toISOString(),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
  const customerId = newCustomerRef.key;
  console.log('Created customer:', customerId);

  // 3) Create booking
  const bookingsRef = ref(rtdb, 'bookings');
  const newBookingRef = push(bookingsRef);
  await set(newBookingRef, {
    customerId,
    roomNo: roomObj.room_no?.toString() || roomKey,
    checkInDate: new Date().toISOString(),
    checkOutDate: new Date(Date.now() + 24*3600*1000).toISOString(),
    status: 'active',
    createdAt: Date.now(),
  });
  const bookingId = newBookingRef.key;
  console.log('Created booking:', bookingId);

  // Mark room occupied
  await update(ref(rtdb, `rooms/${roomKey}`), {
    is_available: false,
    status: 'occupied',
    current_booking_id: bookingId,
    updatedAt: Date.now(),
  });

  // Snapshot after booking
  const afterBookingRoom = (await get(ref(rtdb, `rooms/${roomKey}`))).val();
  const bookingNode = (await get(ref(rtdb, `bookings/${bookingId}`))).val();
  console.log('After booking - room snapshot:', JSON.stringify(afterBookingRoom, null, 2));
  console.log('Saved booking node:', JSON.stringify(bookingNode, null, 2));

  // 4) Checkout: update booking and free room
  await update(ref(rtdb, `bookings/${bookingId}`), {
    status: 'checked_out',
    checkOutActual: new Date().toISOString(),
    updatedAt: Date.now(),
  });

  await update(ref(rtdb, `rooms/${roomKey}`), {
    is_available: true,
    status: 'available',
    current_booking_id: null,
    updatedAt: Date.now(),
  });

  // Snapshot after checkout
  const afterCheckoutRoom = (await get(ref(rtdb, `rooms/${roomKey}`))).val();
  const bookingAfter = (await get(ref(rtdb, `bookings/${bookingId}`))).val();
  console.log('After checkout - room snapshot:', JSON.stringify(afterCheckoutRoom, null, 2));
  console.log('After checkout - booking node:', JSON.stringify(bookingAfter, null, 2));

  // Done
  console.log('Smoke test complete. Created customer:', customerId, 'booking:', bookingId, 'roomKey:', roomKey);

  // Cleanup: remove created customer, booking, and temporary room (if we created one)
  try {
    console.log('Cleaning up test nodes...');
    await set(ref(rtdb, `customers/${customerId}`), null);
    await set(ref(rtdb, `bookings/${bookingId}`), null);
    if (createdTestRoomKey) {
      await set(ref(rtdb, `rooms/${createdTestRoomKey}`), null);
      console.log('Removed temporary room:', createdTestRoomKey);
    } else {
      // restore original room to available state (defensive)
      await update(ref(rtdb, `rooms/${roomKey}`), {
        is_available: true,
        status: 'available',
        current_booking_id: null,
        updatedAt: Date.now(),
      });
      console.log('Restored original room to available');
    }
    console.log('Cleanup complete');
  } catch (cleanupErr) {
    console.warn('Cleanup failed:', cleanupErr);
  }
}

run().catch((e) => {
  console.error('Smoke test failed:', e);
  process.exit(2);
});
