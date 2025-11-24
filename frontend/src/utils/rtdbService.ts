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
} from 'firebase/database';
import { TOTAL_ROOMS } from './roomConstants';

export type RtdbRoom = {
  key: string;
  room_no: number;
  beds: number;
  type: string;
  ac_make?: string;
  remarks?: string;
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
  idNumber: string;
  idImageUrl?: string | null;
  checkInDate: string;
  checkOutDate: string;
  selectedRoom: string | number;
};

export const createCustomer = async (data: RtdbCustomerInput): Promise<string> => {
  const customersRef = ref(rtdb, 'customers');
  const newCustomerRef = push(customersRef);
  const now = Date.now();

  // Persist the exact field names requested by product plus legacy aliases for existing UI.
  await set(newCustomerRef, {
    guestName: data.guestName,
    fatherName: data.fatherName ?? '',
    mobileNumber: data.mobileNumber,
    membersCount: data.membersCount,
    vehicleNumber: data.vehicleNumber ?? '',
    address: data.address ?? '',
    city: data.city ?? '',
    idType: 'Aadhaar',
    idNumber: data.idNumber,
    idImageUrl: data.idImageUrl ?? '',
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

export const createBooking = async (
  customerId: string,
  roomNo: string | number,
  checkInDate: string,
  checkOutDate: string
): Promise<string> => {
  const bookingsRef = ref(rtdb, 'bookings');
  const newBookingRef = push(bookingsRef);
  const now = Date.now();
  await set(newBookingRef, {
    customerId,
    roomNo: roomNo.toString(),
    checkInDate,
    checkOutDate,
    status: 'active',
    createdAt: now,
  });
  return newBookingRef.key as string;
};

export const markRoomOccupied = async (roomKey: string, bookingId: string) => {
  const roomRef = ref(rtdb, `rooms/${roomKey}`);
  await update(roomRef, {
    is_available: false,
    current_booking_id: bookingId,
  });
};

export const fetchCustomers = async (): Promise<
  Array<{
    id: string;
    name: string;
    mobile: string;
    father_name?: string;
    address?: string;
    city?: string;
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
    };
  });
};

export const computeRoomStats = (rooms: RtdbRoom[]) => {
  // Always report against the fixed inventory size (45), even if RTDB has fewer entries.
  const totalRooms = TOTAL_ROOMS;
  const occupiedRooms = rooms.filter((r) => !r.is_available).length;
  const availableRooms = Math.max(totalRooms - occupiedRooms, 0);
  const occupiedRoomNos = rooms.filter((r) => !r.is_available).map((r) => r.room_no);
  return { totalRooms, occupiedRooms, availableRooms, occupiedRoomNos };
};

export type BookingDetail = {
  id: string;
  customerId: string;
  roomNo: string;
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
  };
  room?: RtdbRoom;
};

export const fetchBookingById = async (bookingId: string): Promise<BookingDetail | null> => {
  const bookingRef = ref(rtdb, `bookings/${bookingId}`);
  const [bookingSnap, customersSnap, roomsSnap] = await Promise.all([
    get(bookingRef),
    get(ref(rtdb, 'customers')),
    get(ref(rtdb, 'rooms')),
  ]);
  if (!bookingSnap.exists()) return null;
  const bookingVal = bookingSnap.val() as any;
  const customersVal = customersSnap.val() || {};
  const roomsVal = roomsSnap.val() || {};

  const roomEntry = Object.entries(roomsVal).find(
    ([, value]: any) => value.room_no?.toString() === bookingVal.roomNo?.toString()
  );
  const roomKey = roomEntry ? roomEntry[0] : undefined;
  const room = roomEntry
    ? mapRoomsSnapshot({ val: () => ({ [roomEntry[0]]: roomEntry[1] }) } as any)[0]
    : undefined;

  const customer = customersVal[bookingVal.customerId];

  return {
    id: bookingId,
    customerId: bookingVal.customerId,
    roomNo: bookingVal.roomNo,
    status: bookingVal.status,
    checkInDate: bookingVal.checkInDate,
    checkOutDate: bookingVal.checkOutDate,
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
        }
      : undefined,
  };
};

export const checkoutBooking = async (bookingId: string) => {
  const bookingSnap = await get(ref(rtdb, `bookings/${bookingId}`));
  if (!bookingSnap.exists()) throw new Error('Booking not found');
  const bookingVal = bookingSnap.val() as any;

  const roomsSnap = await get(ref(rtdb, 'rooms'));
  const roomsVal = roomsSnap.val() || {};
  const roomEntry = Object.entries(roomsVal).find(
    ([, value]: any) => value.room_no?.toString() === bookingVal.roomNo?.toString()
  );
  const roomKey = roomEntry ? roomEntry[0] : null;

  const nowIso = new Date().toISOString();

  await update(ref(rtdb, `bookings/${bookingId}`), {
    status: 'checked_out',
    checkOutActual: nowIso,
    updatedAt: Date.now(),
  });

  if (roomKey) {
    await update(ref(rtdb, `rooms/${roomKey}`), {
      is_available: true,
      current_booking_id: null,
    });
  }
};

export const fetchAvailableRooms = async (): Promise<RtdbRoom[]> => {
  const roomsRef = ref(rtdb, 'rooms');
  const snap = await get(roomsRef);
  if (!snap.exists()) return [];
  return mapRoomsSnapshot(snap).filter((room) => room.is_available);
};

export const fetchAllRooms = async (): Promise<RtdbRoom[]> => {
  const roomsRef = ref(rtdb, 'rooms');
  const snap = await get(roomsRef);
  if (!snap.exists()) return [];
  return mapRoomsSnapshot(snap);
};

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
    return {
      key,
      room_no: Number(room.room_no) || Number(key) || 0,
      beds: Number(room.beds) || 1,
      type: room.type || 'Standard',
      ac_make: room.ac_make,
      remarks: room.remarks,
      is_available: !!room.is_available,
      current_booking_id: room.current_booking_id ?? null,
    } as RtdbRoom;
  });
};
