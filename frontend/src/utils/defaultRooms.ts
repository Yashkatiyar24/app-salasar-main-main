import { RoomStatus } from '../types';
import { DEFAULT_ROOM_STATUS } from './roomConstants';

type SeedRoom = {
  room_no: number;
  beds: number;
  type: string;
  ac_make: string;
  remarks: string;
  is_available: boolean;
  current_booking_id: string | null;
};

const rawRooms: SeedRoom[] = [
  { room_no: 1, beds: 1, type: 'AC', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 2, beds: 3, type: 'AC', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 3, beds: 3, type: 'AC', ac_make: 'LLOYD', remarks: '2 Bed rooms - 8', is_available: true, current_booking_id: null },
  { room_no: 4, beds: 2, type: 'AC', ac_make: '', remarks: '3 Bed rooms - 12', is_available: true, current_booking_id: null },
  { room_no: 5, beds: 3, type: 'AC', ac_make: '', remarks: '4 Bed rooms - 15', is_available: true, current_booking_id: null },
  { room_no: 6, beds: 4, type: 'AC', ac_make: '', remarks: '6 Bed rooms - 3', is_available: true, current_booking_id: null },
  { room_no: 7, beds: 4, type: 'AC', ac_make: '', remarks: 'total rooms 38', is_available: true, current_booking_id: null },
  { room_no: 8, beds: 3, type: 'AC', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 9, beds: 2, type: 'AC', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 10, beds: 3, type: 'AC', ac_make: '', remarks: '2 Bed AC rooms - 6', is_available: true, current_booking_id: null },
  { room_no: 11, beds: 3, type: 'AC', ac_make: '', remarks: '3 Bed AC rooms - 12', is_available: true, current_booking_id: null },
  { room_no: 101, beds: 4, type: 'AC', ac_make: '', remarks: '4 Bed AC rooms - 12', is_available: true, current_booking_id: null },
  { room_no: 102, beds: 3, type: 'AC', ac_make: '', remarks: '6 Bed AC rooms - 3', is_available: true, current_booking_id: null },
  { room_no: 103, beds: 3, type: 'AC', ac_make: '', remarks: 'Total AC rooms - 33', is_available: true, current_booking_id: null },
  { room_no: 104, beds: 2, type: 'Non AC', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 105, beds: 2, type: 'AC', ac_make: 'LLOYD', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 106, beds: 3, type: 'AC', ac_make: 'LLOYD', remarks: '2 Bed Non AC - 2', is_available: true, current_booking_id: null },
  { room_no: 107, beds: 0, type: 'Staff Room', ac_make: '', remarks: '4 Bed Non AC - 3', is_available: true, current_booking_id: null },
  { room_no: 108, beds: 0, type: 'Staff Room', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 109, beds: 0, type: 'Staff Room', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 110, beds: 0, type: 'Staff Room', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 111, beds: 2, type: 'Non AC', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 112, beds: 2, type: 'AC', ac_make: 'IFB', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 113, beds: 3, type: 'AC', ac_make: 'OLD', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 114, beds: 3, type: 'AC', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 115, beds: 3, type: 'AC', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 116, beds: 4, type: 'AC', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 201, beds: 4, type: 'AC', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 202, beds: 6, type: 'AC', ac_make: 'IFB', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 203, beds: 4, type: 'AC', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 204, beds: 6, type: 'AC', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 205, beds: 4, type: 'AC', ac_make: 'WHIRLPOOL', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 206, beds: 2, type: 'AC', ac_make: 'LLOYD', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 207, beds: 4, type: 'AC', ac_make: 'LLOYD (NEW)', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 208, beds: 4, type: 'AC', ac_make: 'IFB', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 209, beds: 2, type: 'AC', ac_make: 'LLOYD', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 210, beds: 4, type: 'AC', ac_make: 'DOLLER', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 211, beds: 4, type: 'Non AC', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 301, beds: 4, type: 'Non AC', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 302, beds: 0, type: 'Non AC', ac_make: 'Small Hall', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 303, beds: 4, type: 'AC', ac_make: 'LLOYD (NEW)', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 304, beds: 4, type: 'AC', ac_make: 'IFB, LLOYD', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 305, beds: 4, type: 'Non AC', ac_make: '', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 306, beds: 6, type: 'AC', ac_make: 'LLOYD', remarks: '', is_available: true, current_booking_id: null },
  { room_no: 307, beds: 4, type: 'AC', ac_make: 'LLOYD (NEW)', remarks: '', is_available: true, current_booking_id: null },
];

export const defaultRoomSeeds = rawRooms.map((room) => {
  const status: RoomStatus = room.is_available ? DEFAULT_ROOM_STATUS : 'OCCUPIED';
  return {
    room_number: room.room_no.toString(),
    type: room.type,
    capacity: room.beds > 0 ? room.beds : 1,
    price_per_night: 0,
    status,
    ac_make: room.ac_make,
    remarks: room.remarks,
    current_booking_id: room.current_booking_id ?? undefined,
  };
});
