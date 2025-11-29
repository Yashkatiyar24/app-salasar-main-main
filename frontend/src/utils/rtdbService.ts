import { rtdb } from '@/lib/firebase';
import {
  ref,
  push,
  set,
  update,
  get,
  onValue,
  off,
  DataSnapshot,
  runTransaction,
} from 'firebase/database';
import { TOTAL_ROOMS } from './roomConstants';
import { BookingStatus } from '../types';

export type RtdbRoom = {
  key: string;
  room_no: number;
  beds: number;
  type: string;
  ac_make?: string;
  remarks?: string;
  status?: 'available' | 'occupied';
  is_available: boolean;
  current_booking_id?: string | null;
};

export type RtdbCustomerInput = {
  guestName: string;
  fatherName?: string;
  mobileNumber: string;
  membersCount: number;
  vehicleNumber?: string;
  address?: string;
  city?: string;
  amount?: string;
  idNumber: string;
  idImageUrl?: string | null;
  idImageUrls?: string[];
  checkInDate: string;
  checkOutDate: string;
  selectedRoom: string | number;
};

export const updateCustomer = async (
  id: string,
  data: Partial<RtdbCustomerInput>
): Promise<void> => {
  const now = Date.now();
  const idImages = data.idImageUrls && data.idImageUrls.length > 0 ? data.idImageUrls : undefined;
  const updates: any = {
    updatedAt: now,
  };

  const maybeAssign = (key: string, value: any) => {
    if (value !== undefined) updates[key] = value;
  };

  maybeAssign('guestName', data.guestName);
  maybeAssign('fatherName', data.fatherName);
  maybeAssign('mobileNumber', data.mobileNumber);
  maybeAssign('membersCount', data.membersCount);
  maybeAssign('vehicleNumber', data.vehicleNumber);
  maybeAssign('address', data.address);
  maybeAssign('city', data.city);
  maybeAssign('amount', data.amount);
  maybeAssign('idType', data.idImageUrl || idImages ? 'Aadhaar' : undefined);
  maybeAssign('idNumber', data.idNumber);
  maybeAssign('idImageUrl', idImages ? idImages[0] : data.idImageUrl);
  maybeAssign('idImageUrls', idImages);
  maybeAssign('checkInDate', data.checkInDate);
  maybeAssign('checkOutDate', data.checkOutDate);
  maybeAssign('selectedRoom', data.selectedRoom);

  // legacy aliases
  maybeAssign('name', data.guestName);
  maybeAssign('father_name', data.fatherName);
  maybeAssign('phone', data.mobileNumber);
  maybeAssign('member_count', data.membersCount);
  maybeAssign('vehicle_number', data.vehicleNumber);
  maybeAssign('address', data.address);
  maybeAssign('city', data.city);
  maybeAssign('amount', data.amount);
  maybeAssign('id_number', data.idNumber);
  maybeAssign('id_image_url', idImages ? idImages[0] : data.idImageUrl);
  maybeAssign('id_image_urls', idImages);

  await update(ref(rtdb, `customers/${id}`), updates);
};

export const deleteCustomer = async (id: string): Promise<void> => {
  await set(ref(rtdb, `customers/${id}`), null);
};

export const createCustomer = async (data: RtdbCustomerInput): Promise<string> => {
  const customersRef = ref(rtdb, 'customers');
  const newCustomerRef = push(customersRef);
  const now = Date.now();
  const idImages = data.idImageUrls && data.idImageUrls.length > 0 ? data.idImageUrls : [];

  // Persist the exact field names requested by product plus legacy aliases for existing UI.
  await set(newCustomerRef, {
    guestName: data.guestName,
    fatherName: data.fatherName ?? '',
    mobileNumber: data.mobileNumber,
    membersCount: data.membersCount,
    vehicleNumber: data.vehicleNumber ?? '',
    address: data.address ?? '',
    city: data.city ?? '',
    amount: data.amount ?? '',
    idType: 'Aadhaar',
    idNumber: data.idNumber,
    idImageUrl: idImages[0] ?? data.idImageUrl ?? '',
    idImageUrls: idImages.length ? idImages : data.idImageUrl ? [data.idImageUrl] : [],
    checkInDate: data.checkInDate,
    checkOutDate: data.checkOutDate,
    selectedRoom: data.selectedRoom,
    status: 'active',
    createdAt: now,
    updatedAt: now,

    // Legacy aliases (for existing list components)
    name: data.guestName,
    father_name: data.fatherName ?? '',
    phone: data.mobileNumber,
    id_type: 'Aadhaar',
    id_number: data.idNumber,
    id_image_url: data.idImageUrl ?? '',
    member_count: data.membersCount,
    vehicle_number: data.vehicleNumber ?? '',
  });
  return newCustomerRef.key as string;
};

const matchesRoomNumber = (value: any, roomNo: string | number) =>
  value.room_no?.toString() === roomNo?.toString() ||
  value.roomNumber?.toString() === roomNo?.toString();

const findRoomEntryByRoomNo = (
  roomsVal: Record<string, any>,
  roomNo: string | number
): [string, any] | undefined =>
  Object.entries(roomsVal).find(([, value]: any) => matchesRoomNumber(value, roomNo)) as
    | [string, any]
    | undefined;

const ensureRoomExists = async (
  roomNo: string | number,
  roomsVal: Record<string, any>
): Promise<{ roomKey: string; roomVal: any }> => {
  const existing = findRoomEntryByRoomNo(roomsVal, roomNo);
  if (existing) {
    return { roomKey: existing[0], roomVal: existing[1] };
  }
  const roomsRef = ref(rtdb, 'rooms');
  const newRoomRef = push(roomsRef);
  const now = Date.now();
  const payload = {
    room_no: Number(roomNo),
    roomNumber: Number(roomNo),
    beds: 1,
    type: 'Standard',
    status: 'available',
    is_available: true,
    remarks: '',
    current_booking_id: null,
    createdAt: now,
    updatedAt: now,
  };
  await set(newRoomRef, payload);
  return { roomKey: newRoomRef.key as string, roomVal: payload };
};

function deriveRoomAvailability(room: any) {
  const hasActiveBooking = Boolean(room?.current_booking_id);
  const availableFlag = room?.is_available !== false;
  const isAvailable = availableFlag && !hasActiveBooking;
  return {
    isAvailable,
    normalizedStatus: isAvailable ? 'available' : 'occupied',
  };
}

export function normalizeBookingStatus(status?: string): BookingStatus {
  const normalized = (status || '').toString().toUpperCase();
  if (normalized === 'CHECKED_OUT' || normalized === 'CHECKEDOUT') return 'CHECKED_OUT';
  if (normalized === 'CANCELLED') return 'CANCELLED';
  return 'BOOKED';
}

export const createBooking = async (
  customerId: string,
  roomNo: string | number,
  checkInDate: string,
  checkOutDate: string
): Promise<string> => {
  const roomsSnap = await get(ref(rtdb, 'rooms'));
  const roomsVal = roomsSnap.val() || {};
  const { roomKey, roomVal } = await ensureRoomExists(roomNo, roomsVal);
  const bookingsRef = ref(rtdb, 'bookings');
  const newBookingRef = push(bookingsRef);
  const bookingId = newBookingRef.key as string;
  const now = Date.now();
  const roomRef = ref(rtdb, `rooms/${roomKey}`);
  let roomLocked = false;

  try {
    // Atomically reserve the room: abort if already occupied.
    const txResult = await runTransaction(roomRef, (currentRoom) => {
      const existingRoom = currentRoom || roomVal;
      if (!existingRoom) return;
      const { isAvailable } = deriveRoomAvailability(existingRoom);
      if (!isAvailable) return;

      return {
        ...existingRoom,
        is_available: false,
        status: 'occupied',
        current_booking_id: bookingId,
        updatedAt: now,
      };
    });

    if (!txResult.committed) {
      throw new Error('Room already occupied');
    }
    roomLocked = true;

    await set(newBookingRef, {
      customerId,
      roomNo: roomNo.toString(),
      checkInDate,
      checkOutDate,
      status: 'BOOKED',
      createdAt: now,
      updatedAt: now,
    });

    return bookingId;
  } catch (error) {
    if (roomLocked) {
      // Roll back room lock if booking write fails.
      await update(roomRef, {
        is_available: true,
        status: 'available',
        current_booking_id: null,
        updatedAt: Date.now(),
      }).catch(() => {});
    }
    throw error;
  }
};

export const markRoomOccupied = async (roomKey: string, bookingId: string) => {
  const roomRef = ref(rtdb, `rooms/${roomKey}`);
  const now = Date.now();
  const res = await runTransaction(roomRef, (currentRoom) => {
    if (!currentRoom) return;
    const { isAvailable } = deriveRoomAvailability(currentRoom);
    if (!isAvailable && currentRoom.current_booking_id !== bookingId) {
      return;
    }
    return {
      ...currentRoom,
      is_available: false,
      status: 'occupied',
      current_booking_id: bookingId,
      updatedAt: now,
    };
  });

  if (!res.committed) {
    throw new Error('Room already occupied');
  }
};

export const fetchCustomers = async (): Promise<
  Array<{
    id: string;
    name: string;
    mobile: string;
    father_name?: string;
    address?: string;
    city?: string;
    id_number?: string;
    id_type?: string;
    membersCount?: number;
    vehicleNumber?: string;
    createdAt?: number;
    checkInDate?: string;
    idImageUrl?: string;
    idImageUrls?: string[];
  }>
> => {
  const customersRef = ref(rtdb, 'customers');
  const snap = await get(customersRef);
  if (!snap.exists()) return [];
  const val = snap.val() || {};
  return Object.entries(val).map(([key, value]) => {
    const c = value as any;
    return {
      id: key,
      name: c.guestName || c.name || 'Guest',
      father_name: c.fatherName || c.father_name || '',
      address: c.address || '',
      city: c.city || '',
      mobile: c.mobileNumber || c.phone || '',
      id_number: c.idNumber || c.id_number || '',
      id_type: c.idType || c.id_type || 'Aadhaar',
      membersCount: c.membersCount || c.member_count || 1,
      vehicleNumber: c.vehicleNumber || c.vehicle_number || '',
      createdAt: typeof c.createdAt === 'number' ? c.createdAt : undefined,
      checkInDate: c.checkInDate,
      idImageUrl: c.idImageUrl || c.id_image_url || '',
      idImageUrls: c.idImageUrls || [],
    };
  });
};

export const fetchCustomerById = async (
  id: string
): Promise<{
  id: string;
  name: string;
  father_name?: string;
  address?: string;
  city?: string;
  amount?: string;
  mobile: string;
  id_number?: string;
  id_type?: string;
  membersCount?: number;
  vehicleNumber?: string;
  createdAt?: number;
  checkInDate?: string;
  idImageUrl?: string;
  idImageUrls?: string[];
} | null> => {
  const snap = await get(ref(rtdb, `customers/${id}`));
  if (!snap.exists()) return null;
  const c = snap.val() as any;
  const amount = c.amount ?? '';
  return {
    id,
    name: c.guestName || c.name || 'Guest',
    father_name: c.fatherName || c.father_name || '',
    address: c.address || '',
    amount,
    mobile: c.mobileNumber || c.phone || '',
    id_number: c.idNumber || c.id_number || '',
    id_type: c.idType || c.id_type || 'Aadhaar',
    membersCount: c.membersCount || c.member_count || 1,
    vehicleNumber: c.vehicleNumber || c.vehicle_number || '',
    createdAt: typeof c.createdAt === 'number' ? c.createdAt : undefined,
    checkInDate: c.checkInDate,
    idImageUrl: c.idImageUrl || c.id_image_url || '',
    idImageUrls: c.idImageUrls || [],
  };
};

export const subscribeToCustomers = (
  callback: (
    customers: Array<{
      id: string;
      name: string;
      mobile: string;
      father_name?: string;
      address?: string;
      city?: string;
      id_number?: string;
      id_type?: string;
      membersCount?: number;
      vehicleNumber?: string;
      createdAt?: number;
      checkInDate?: string;
      idImageUrl?: string;
      idImageUrls?: string[];
    }>
  ) => void,
  onError?: (error: unknown) => void
) => {
  const customersRef = ref(rtdb, 'customers');
  const handler = (snap: DataSnapshot) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const val = snap.val() || {};
    const mapped = Object.entries(val).map(([key, value]) => {
      const c = value as any;
      return {
        id: key,
        name: c.guestName || c.name || 'Guest',
        father_name: c.fatherName || c.father_name || '',
        address: c.address || '',
        city: c.city || '',
        mobile: c.mobileNumber || c.phone || '',
        id_number: c.idNumber || c.id_number || '',
        id_type: c.idType || c.id_type || 'Aadhaar',
        membersCount: c.membersCount || c.member_count || 1,
      vehicleNumber: c.vehicleNumber || c.vehicle_number || '',
      createdAt: typeof c.createdAt === 'number' ? c.createdAt : undefined,
      checkInDate: c.checkInDate,
      idImageUrl: c.idImageUrl || c.id_image_url || '',
    };
  });
  callback(mapped);
};
  const errorHandler = (error: unknown) => {
    console.error('RTDB customers subscription error', error);
    if (onError) onError(error);
  };
  onValue(customersRef, handler, errorHandler);
  return () => off(customersRef, 'value', handler);
};

const roomIsAvailable = (room: RtdbRoom) =>
  room.is_available !== false && !room.current_booking_id;

export const computeRoomStats = (rooms: RtdbRoom[]) => {
  // Always report against the fixed inventory size (45), even if RTDB has fewer entries.
  const totalRooms = TOTAL_ROOMS;
  const occupiedRooms = rooms.filter((r) => !roomIsAvailable(r)).length;
  const availableRooms = Math.max(totalRooms - occupiedRooms, 0);
  const occupiedRoomNos = rooms
    .filter((r) => !roomIsAvailable(r))
    .map((r) => r.room_no)
    .sort((a, b) => a - b);
  return { totalRooms, occupiedRooms, availableRooms, occupiedRoomNos };
};

export type BookingDetail = {
  id: string;
  customerId: string;
  roomNo: string;
  roomNumbers?: number[];
  status: string;
  checkInDate: string;
  checkOutDate: string;
  checkOutActual?: string;
  createdAt?: number;
  roomKey?: string;
  customer?: {
    name: string;
    mobile: string;
    father_name?: string;
    address?: string;
    city?: string;
    amount?: string;
  };
  room?: RtdbRoom;
};

export const fetchBookingById = async (bookingId: string): Promise<BookingDetail | null> => {
  const bookingRef = ref(rtdb, `bookings/${bookingId}`);
  const [bookingSnap, customersSnap, roomsSnap, bookingsSnap] = await Promise.all([
    get(bookingRef),
    get(ref(rtdb, 'customers')),
    get(ref(rtdb, 'rooms')),
    get(ref(rtdb, 'bookings')),
  ]);
  if (!bookingSnap.exists()) return null;
  const bookingVal = bookingSnap.val() as any;
  const customersVal = customersSnap.val() || {};
  const roomsVal = roomsSnap.val() || {};
  const allBookingsVal = bookingsSnap.val() || {};

  const roomEntry = findRoomEntryByRoomNo(roomsVal, bookingVal.roomNo);
  const roomKey = roomEntry ? roomEntry[0] : undefined;
  const room = roomEntry
    ? mapRoomsSnapshot({ val: () => ({ [roomEntry[0]]: roomEntry[1] }) } as any)[0]
    : undefined;

  const customer = customersVal[bookingVal.customerId];

  const roomNumbers = new Set<number>();
  const selectedRoomField =
    customer?.selectedRoom || customer?.selected_room || customer?.selectedRooms || bookingVal?.selectedRoom;
  if (selectedRoomField && typeof selectedRoomField === 'string') {
    selectedRoomField
      .split(',')
      .map((s: string) => Number(s.trim()))
      .filter((n: number) => !Number.isNaN(n))
      .forEach((n: number) => roomNumbers.add(n));
  }
  Object.values<any>(allBookingsVal).forEach((b: any) => {
    if (b?.customerId !== bookingVal.customerId) return;
    const status = normalizeBookingStatus(b?.status);
    if (status === 'CHECKED_OUT') return;
    const rn = Number(b?.roomNo ?? b?.room_no);
    if (!Number.isNaN(rn)) roomNumbers.add(rn);
  });

  return {
    id: bookingId,
    customerId: bookingVal.customerId,
    roomNo: bookingVal.roomNo,
    roomNumbers: Array.from(roomNumbers.values()),
    status: normalizeBookingStatus(bookingVal.status),
    checkInDate: bookingVal.checkInDate,
    checkOutDate: bookingVal.checkOutDate || bookingVal.checkoutDate,
    checkOutActual: bookingVal.checkOutActual,
    createdAt: bookingVal.createdAt,
    roomKey,
    room,
    customer: customer
      ? {
          name: customer.guestName || customer.name || 'Guest',
          mobile: customer.mobileNumber || customer.phone || '',
          father_name: customer.fatherName || customer.father_name || '',
          address: customer.address || '',
          city: customer.city || '',
          amount: customer.amount || '',
        }
      : undefined,
  };
};

export const handleCheckout = async (bookingId: string) => {
  const bookingRef = ref(rtdb, `bookings/${bookingId}`);
  const bookingSnap = await get(bookingRef);
  if (!bookingSnap.exists()) throw new Error('Booking not found');
  const bookingVal = bookingSnap.val() as any;
  const customerId = bookingVal.customerId;

  // Load all bookings + rooms once
  const [bookingsSnap, roomsSnap] = await Promise.all([
    get(ref(rtdb, 'bookings')),
    get(ref(rtdb, 'rooms')),
  ]);
  const roomsVal = roomsSnap.val() || {};
  const allBookings = bookingsSnap.val() || {};

  const nowIso = new Date().toISOString();

  const toCheckout: Array<{ id: string; val: any }> = [];
  for (const [id, val] of Object.entries<any>(allBookings)) {
    if (customerId && val?.customerId !== customerId) continue;
    const status = normalizeBookingStatus(val?.status);
    if (status === 'CHECKED_OUT') continue;
    toCheckout.push({ id, val });
  }

  // Checkout each booking and free its room
  for (const entry of toCheckout) {
    const bVal = entry.val;
    const checkoutDate = bVal.checkOutDate || bVal.checkoutDate || nowIso;
    const bRef = ref(rtdb, `bookings/${entry.id}`);
    await update(bRef, {
      status: 'checked_out',
      checkOutActual: nowIso,
      checkOutDate: checkoutDate,
      checkoutDate,
      updatedAt: Date.now(),
    });

    const { roomKey } = await ensureRoomExists(bVal.roomNo, roomsVal);
    const roomRef = ref(rtdb, `rooms/${roomKey}`);
    await runTransaction(roomRef, (room) => {
      if (!room) return room;
      return {
        ...room,
        is_available: true,
        status: 'available',
        current_booking_id: null,
        updatedAt: Date.now(),
      };
    });
  }
};

// alias for existing callers
export const checkoutBooking = handleCheckout;

// Convenience helper to mark a room available (can be used independently)
export const markRoomAvailable = async (roomKey: string) => {
  const roomRef = ref(rtdb, `rooms/${roomKey}`);
  await update(roomRef, {
    is_available: true,
    status: 'available',
    current_booking_id: null,
    updatedAt: Date.now(),
  });
};

/**
 * Reconcile room availability using bookings snapshot.
 * - For bookings with status 'CHECKED_OUT' ensure the linked room is marked available.
 * - For bookings with status 'BOOKED' but checkOutDate in the past, mark booking CHECKED_OUT and release room.
 * This can be called as an admin action or run periodically to fix historical state.
 */
export const reconcileRoomsFromBookings = async () => {
  const bookingsSnap = await get(ref(rtdb, 'bookings'));
  if (!bookingsSnap.exists()) return { processed: 0 };
  const bookingsVal = bookingsSnap.val() || {};

  const roomsSnap = await get(ref(rtdb, 'rooms'));
  const roomsVal = roomsSnap.val() || {};

  let processed = 0;

  const now = Date.now();

  for (const [bookingId, b] of Object.entries(bookingsVal)) {
    const booking: any = b as any;
    const status: string = booking.status;
    const roomNo = booking.roomNo;
    const checkoutStr = booking.checkOutDate || booking.checkoutDate;

    // Determine if booking should be considered checked out
    const checkoutDateMs = checkoutStr ? new Date(checkoutStr).getTime() : null;
    const isPastCheckout = checkoutDateMs !== null && checkoutDateMs <= now;
    const normalizedStatus = normalizeBookingStatus(status);

    if (normalizedStatus === 'CHECKED_OUT' || isPastCheckout) {
      // Find matching room key by room_no
      const roomEntry = findRoomEntryByRoomNo(roomsVal, roomNo);
      const roomKey = roomEntry ? roomEntry[0] : null;

      // Update booking if it's still marked booked/pending
      const bookingUpdates: any = {};
      if (normalizedStatus !== 'CHECKED_OUT') {
        const checkoutIso = new Date().toISOString();
        bookingUpdates.status = 'CHECKED_OUT';
        bookingUpdates.checkOutActual = booking.checkOutActual ?? checkoutStr ?? checkoutIso;
        bookingUpdates.checkOutDate = booking.checkOutDate || booking.checkoutDate || checkoutIso;
        bookingUpdates.checkoutDate = bookingUpdates.checkOutDate;
        bookingUpdates.updatedAt = Date.now();
      }

      if (Object.keys(bookingUpdates).length > 0) {
        await update(ref(rtdb, `bookings/${bookingId}`), bookingUpdates);
      }

      if (roomKey) {
        // Only set available if the room is currently marked occupied.
        const roomObj: any = roomsVal[roomKey];
        const { isAvailable } = deriveRoomAvailability(roomObj);
        if (roomObj && roomObj.current_booking_id && roomObj.current_booking_id === bookingId) {
          await update(ref(rtdb, `rooms/${roomKey}`), {
            is_available: true,
            status: 'available',
            current_booking_id: null,
            updatedAt: Date.now(),
          });
        } else if (roomObj && !isAvailable) {
          // If room appears occupied but booking id doesn't match, still free it to unblock availability.
          await update(ref(rtdb, `rooms/${roomKey}`), {
            is_available: true,
            status: 'available',
            current_booking_id: null,
            updatedAt: Date.now(),
          });
        }
      }

      processed += 1;
    }
  }

  return { processed };
};

export const fetchAvailableRooms = async (): Promise<RtdbRoom[]> => {
  const roomsRef = ref(rtdb, 'rooms');
  const snap = await get(roomsRef);
  if (!snap.exists()) return [];
  return mapRoomsSnapshot(snap).filter((room) => roomIsAvailable(room));
};

export const fetchAllRooms = async (): Promise<RtdbRoom[]> => {
  const roomsRef = ref(rtdb, 'rooms');
  const snap = await get(roomsRef);
  if (!snap.exists()) return [];
  return mapRoomsSnapshot(snap);
};

export const subscribeToRooms = (
  callback: (rooms: RtdbRoom[]) => void,
  onError?: (error: unknown) => void
) => {
  const roomsRef = ref(rtdb, 'rooms');
  const handler = (snap: DataSnapshot) => {
    callback(mapRoomsSnapshot(snap));
  };
  const errorHandler = (error: unknown) => {
    console.error('RTDB rooms subscription error', error);
    if (onError) onError(error);
  };
  onValue(roomsRef, handler, errorHandler);
  return () => off(roomsRef, 'value', handler);
};

export const subscribeAvailableRooms = (
  callback: (rooms: RtdbRoom[]) => void,
  onError?: (error: unknown) => void
) =>
  subscribeToRooms(
    (rooms) => callback(rooms.filter((r) => roomIsAvailable(r)).sort((a, b) => a.room_no - b.room_no)),
    onError
  );

export const subscribeToDashboardCounts = (
  callback: (data: { totalRooms: number; occupiedRooms: number; availableRooms: number; occupiedRoomNos: number[] }) => void,
  onError?: (error: unknown) => void
) => {
  const roomsRef = ref(rtdb, 'rooms');
  const handler = (snap: DataSnapshot) => {
    const rooms = mapRoomsSnapshot(snap);
    callback(computeRoomStats(rooms));
  };
  const errorHandler = (error: unknown) => {
    console.error('RTDB dashboard subscription error', error);
    if (onError) onError(error);
  };
  onValue(roomsRef, handler, errorHandler);
  return () => off(roomsRef, 'value', handler);
};

const mapRoomsSnapshot = (snap: DataSnapshot): RtdbRoom[] => {
  const val = snap.val() || {};
  return Object.entries(val).map(([key, value]) => {
    const room = value as any;
    const { isAvailable, normalizedStatus } = deriveRoomAvailability(room);
    return {
      key,
      room_no: Number(room.room_no) || Number(key) || 0,
      beds: Number(room.beds) || 1,
      type: room.type || 'Standard',
      ac_make: room.ac_make,
      remarks: room.remarks,
      status: normalizedStatus,
      is_available: isAvailable,
      current_booking_id: room.current_booking_id ?? null,
    } as RtdbRoom;
  });
};
