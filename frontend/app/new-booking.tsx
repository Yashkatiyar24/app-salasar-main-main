import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import LoadingSpinner from '../src/components/LoadingSpinner';
import {
  createBooking,
  createCustomer,
  fetchAllRooms,
  markRoomOccupied,
  RtdbRoom,
} from '../src/utils/rtdbService';
import { defaultRoomSeeds } from '../src/utils/defaultRooms';
import { TOTAL_ROOMS } from '../src/utils/roomConstants';

const NewBookingScreen: React.FC = () => {
  const router = useRouter();

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Guest Details
  const [guestName, setGuestName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [membersCount, setMembersCount] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  // ID Proof
  const [idNumber, setIdNumber] = useState('');
  const [idImageUrl, setIdImageUrl] = useState('');

  // Booking Details
  const [checkInDate, setCheckInDate] = useState(() => new Date());
  const [checkOutDate, setCheckOutDate] = useState(() => new Date(Date.now() + 86400000));
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RtdbRoom | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [rooms, setRooms] = useState<RtdbRoom[]>([]);
  const [roomsErrorShown, setRoomsErrorShown] = useState(false);

  const fallbackRooms = useMemo(
    () =>
      defaultRoomSeeds
        .slice(0, TOTAL_ROOMS)
        .map((seed) => ({
          key: seed.room_number,
          room_no: Number(seed.room_number),
          beds: seed.capacity ?? 1,
          type: seed.type,
          ac_make: seed.ac_make,
          remarks: seed.remarks,
          is_available: seed.status ? seed.status === 'AVAILABLE' : true,
          current_booking_id: seed.current_booking_id ?? null,
        }))
        .filter((room) => room.is_available)
        .sort((a, b) => a.room_no - b.room_no),
    []
  );

  const resetForm = () => {
    setGuestName('');
    setFatherName('');
    setMobileNumber('');
    setMembersCount('');
    setVehicleNumber('');
    setAddress('');
    setCity('');
    setIdNumber('');
    setIdImageUrl('');
    setCheckInDate(new Date());
    setCheckOutDate(new Date(Date.now() + 86400000));
    setSelectedRoom(null);
  };

  const loadRooms = async () => {
    setLoadingRooms(true);
    try {
      const allRooms = await fetchAllRooms();
      const available = allRooms.filter((r) => r.is_available);
      const sorted = available.sort((a, b) => a.room_no - b.room_no);

      // If RTDB returns no rooms or no available rooms, fallback to local seeds so UI isn't empty.
      const finalList =
        sorted.length > 0
          ? sorted
          : fallbackRooms.filter((r) => r.is_available).sort((a, b) => a.room_no - b.room_no);

      setRooms(finalList);

      // Auto-select the first available room
      if (!selectedRoom && finalList.length > 0) {
        setSelectedRoom(finalList[0]);
      }
    } catch (error) {
      console.error('Error fetching available rooms:', error);
      const availableFallback = fallbackRooms.filter((r) => r.is_available);
      setRooms(availableFallback);
      if (!selectedRoom && availableFallback.length > 0) {
        setSelectedRoom(availableFallback[0]);
      }
      if (!roomsErrorShown) {
        const message =
          error && (error as any).code === 'PERMISSION_DENIED'
            ? 'Permission denied while reading rooms. Check your Realtime Database rules or credentials.'
            : 'Unable to load live room availability. Showing default list instead.';
        Alert.alert('Offline mode', message);
        setRoomsErrorShown(true);
      }
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const validateForm = () => {
    if (!guestName.trim()) {
      Alert.alert('Missing Info', 'Guest name is required');
      return false;
    }
    if (!mobileNumber.trim()) {
      Alert.alert('Missing Info', 'Mobile number is required');
      return false;
    }
    if (!membersCount.trim()) {
      Alert.alert('Missing Info', 'Number of members is required');
      return false;
    }
    if (!idNumber.trim()) {
      Alert.alert('Missing Info', 'ID number is required');
      return false;
    }
    if (!selectedRoom) {
      Alert.alert('Missing Info', 'Please select an available room');
      return false;
    }
    if (!selectedRoom.is_available) {
      Alert.alert('Room occupied', 'Please pick a room that is marked available.');
      return false;
    }

    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
      Alert.alert('Missing Info', 'Please enter valid check-in and check-out dates');
      return false;
    }
    if (checkOutDate <= checkInDate) {
      Alert.alert('Invalid Dates', 'Check-out must be after check-in');
      return false;
    }
    return true;
  };

  const handleCreateBooking = async () => {
    if (!validateForm() || !selectedRoom) return;

    const members = Number.parseInt(membersCount, 10) || 0;

    setIsSubmitting(true);
    try {
      const customerId = await createCustomer({
        guestName: guestName.trim(),
        fatherName: fatherName.trim() || undefined,
        mobileNumber: mobileNumber.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        idNumber: idNumber.trim(),
        idImageUrl: idImageUrl.trim() || undefined,
        membersCount: members,
        vehicleNumber: vehicleNumber.trim() || undefined,
        checkInDate: checkInDate.toISOString(),
        checkOutDate: checkOutDate.toISOString(),
        selectedRoom: selectedRoom.room_no.toString(),
      });

      const bookingId = await createBooking(
        customerId,
        selectedRoom.room_no.toString(),
        checkInDate.toISOString(),
        checkOutDate.toISOString()
      );

      try {
        await markRoomOccupied(selectedRoom.key, bookingId);
      } catch (roomErr) {
        console.error('Booking saved but failed to mark room occupied:', roomErr);
      }

      Alert.alert('Success', 'Booking created and saved successfully');
      resetForm();
      loadRooms();
      router.push('/bookings' as any);
    } catch (error: any) {
      console.error('Error creating booking:', error);
      Alert.alert('Error', error?.message || 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingRooms && rooms.length === 0) {
    return <LoadingSpinner message="Loading available rooms..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>New Booking / Check-in</Text>

        <Text style={styles.sectionTitle}>Guest Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Guest Name *"
          value={guestName}
          onChangeText={setGuestName}
        />
        <TextInput
          style={styles.input}
          placeholder="Father's Name"
          value={fatherName}
          onChangeText={setFatherName}
        />
        <TextInput
          style={styles.input}
          placeholder="Mobile Number *"
          value={mobileNumber}
          onChangeText={setMobileNumber}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Number of Members *"
          value={membersCount}
          onChangeText={setMembersCount}
          keyboardType="number-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Vehicle Number"
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
        />
        <TextInput
          style={styles.input}
          placeholder="Address"
          value={address}
          onChangeText={setAddress}
        />
        <TextInput
          style={styles.input}
          placeholder="City"
          value={city}
          onChangeText={setCity}
        />

        <Text style={styles.sectionTitle}>ID Proof</Text>
        <TextInput style={styles.input} value="Aadhaar" editable={false} />
        <TextInput
          style={styles.input}
          placeholder="ID Number *"
          value={idNumber}
          onChangeText={setIdNumber}
        />
        <TextInput
          style={styles.input}
          placeholder="ID Image URL"
          value={idImageUrl}
          onChangeText={setIdImageUrl}
        />

        <Text style={styles.sectionTitle}>Booking Details</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowCheckInPicker(true)}>
          <Text style={styles.inputText}>
            {checkInDate ? formatDate(checkInDate) : 'Select check-in date *'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.input} onPress={() => setShowCheckOutPicker(true)}>
          <Text style={styles.inputText}>
            {checkOutDate ? formatDate(checkOutDate) : 'Select check-out date *'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Select Room</Text>
        {loadingRooms ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#dc2626" />
            <Text style={styles.loadingText}>Fetching rooms...</Text>
          </View>
        ) : rooms.length === 0 ? (
          <Text style={styles.noRoomsText}>No rooms available right now.</Text>
        ) : (
          <View style={styles.roomsGrid}>
            {rooms.map((room) => {
              const isSelected = selectedRoom?.key === room.key;
              return (
                <TouchableOpacity
                  key={room.key}
                  style={[styles.roomCard, isSelected && styles.roomCardSelected]}
                  onPress={() => setSelectedRoom(room)}
                >
                  <View style={styles.roomInfo}>
                    <Text style={styles.roomNumber}>
                      Room {room.room_no} – {room.type} – {room.beds} bed{room.beds === 1 ? '' : 's'}
                    </Text>
                    {room.remarks ? <Text style={styles.roomRemarks}>{room.remarks}</Text> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {showCheckInPicker && (
          <DateTimePicker
            value={checkInDate}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowCheckInPicker(false);
              if (date) setCheckInDate(date);
            }}
          />
        )}
        {showCheckOutPicker && (
          <DateTimePicker
            value={checkOutDate}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowCheckOutPicker(false);
              if (date) setCheckOutDate(date);
            }}
          />
        )}

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleCreateBooking}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Booking</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#111827',
    marginTop: 8,
  },
  inputText: {
    fontSize: 16,
    color: '#111827',
  },
  roomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  roomCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    marginTop: 12,
  },
  roomCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#d1fae5',
  },
  roomInfo: {
    gap: 4,
  },
  roomNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  roomType: {
    fontSize: 14,
    color: '#6b7280',
  },
  roomCapacity: {
    fontSize: 12,
    color: '#6b7280',
  },
  roomRemarks: {
    fontSize: 12,
    color: '#9ca3af',
  },
  roomStatus: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  roomStatusAvailable: {
    color: '#10b981',
  },
  roomStatusOccupied: {
    color: '#ef4444',
  },
  roomCardDisabled: {
    opacity: 0.6,
  },
  noRoomsText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    padding: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    color: '#6b7280',
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#f87171',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default NewBookingScreen;
