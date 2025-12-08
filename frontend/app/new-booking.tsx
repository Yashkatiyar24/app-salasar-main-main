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
  Image,
  Pressable,
} from 'react-native';
import { collection, getDocs, query, Timestamp, where, onSnapshot } from 'firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../src/components/LoadingSpinner';
import {
  createBooking,
  createCustomer,
  subscribeAvailableRooms,
  RtdbRoom,
} from '../src/utils/rtdbService';
import { db, rtdb } from '../src/firebase/firebase';
import { defaultRoomSeeds } from '../src/utils/defaultRooms';
import { TOTAL_ROOMS } from '../src/utils/roomConstants';
import { get, ref as rtdbRef } from 'firebase/database';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const NewBookingScreen: React.FC = () => {
  const router = useRouter();

  const formatDate = (date: Date | null) =>
    date ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  // Guest Details
  const [guestName, setGuestName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [membersCount, setMembersCount] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');

  // ID Proof
  const [idNumber, setIdNumber] = useState('');
  const [idImageUrl, setIdImageUrl] = useState('');
  const [idImageUrls, setIdImageUrls] = useState<string[]>([]);
  const placeholderColor = '#555';

  // Booking Details: Date | null state (default to today / tomorrow for better UX)
  const [checkInDate, setCheckInDate] = useState<Date | null>(new Date());
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<RtdbRoom[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [rooms, setRooms] = useState<RtdbRoom[]>([]);
  const [roomsErrorShown, setRoomsErrorShown] = useState(false);
  const [unavailableRooms, setUnavailableRooms] = useState<Set<number>>(new Set());
  const excludedRooms = useMemo(() => new Set([1, 107, 108, 109, 110]), []);

  // Helper to determine if a room is unavailable. Reused for styling and handlers.
  const isRoomUnavailable = (roomNo: number, room?: RtdbRoom) => {
    // Firestore-derived occupancy state for the selected date
    if (unavailableRooms.has(roomNo)) return true;
    // RTDB-provided flags
    if (room?.is_available === false) return true;
    if (room?.status && room.status.toString().toLowerCase() === 'occupied') return true;
    if (room?.current_booking_id) return true;
    return false;
  };

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
        .filter((room) => ![1, 107, 108, 109, 110].includes(room.room_no))
        .sort((a, b) => a.room_no - b.room_no),
    []
  );

  const buildAvailableList = (liveRooms: RtdbRoom[]) => {
    const seedMap = new Map<number, RtdbRoom>();
    fallbackRooms.forEach((seed) => {
      if (!excludedRooms.has(seed.room_no)) seedMap.set(seed.room_no, seed);
    });
    liveRooms.forEach((room) => {
      if (!excludedRooms.has(room.room_no)) {
        seedMap.set(room.room_no, {
          ...room,
          is_available: room.is_available !== false,
        });
      }
    });
    return Array.from(seedMap.values()).sort((a, b) => a.room_no - b.room_no);
  };

  const resetForm = () => {
    setGuestName('');
    setFatherName('');
    setMobileNumber('');
    setMembersCount('');
    setVehicleNumber('');
    setAddress('');
    setAmount('');
    setIdNumber('');
    setIdImageUrl('');
    setIdImageUrls([]);
    setCheckInDate(null);
    setCheckOutDate(null);
    setSelectedDate(null);
    setSelectedRooms([]);
  };

  useEffect(() => {
    setLoadingRooms(true);
    const unsubscribe = subscribeAvailableRooms(
      (liveRooms) => {
        const usable = buildAvailableList(liveRooms);
        setRooms(usable);
        setSelectedRooms((current) => {
          const stillValid = current.filter((r) => usable.find((u) => u.key === r.key));
          if (stillValid.length > 0) return stillValid;
          const first = usable.find((r) => !isRoomUnavailable(r.room_no, r));
          return first ? [first] : [];
        });
        setLoadingRooms(false);
      },
      (error) => {
        console.error('Error subscribing to rooms:', error);
        const availableFallback = fallbackRooms.filter((r) => r.is_available);
        setRooms(availableFallback);
        setSelectedRooms((current) => {
          const stillValid = current.filter((r) => availableFallback.find((u) => u.key === r.key));
          if (stillValid.length > 0) return stillValid;
          return availableFallback[0] ? [availableFallback[0]] : [];
        });
        if (!roomsErrorShown) {
          const message =
            error && (error as any).code === 'PERMISSION_DENIED'
              ? 'Permission denied while reading rooms. Check your Realtime Database rules or credentials.'
              : 'Unable to load live room availability. Showing default list instead.';
          Alert.alert('Offline mode', message);
          setRoomsErrorShown(true);
        }
        setLoadingRooms(false);
      }
    );
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizeToDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
  };

  const getDayBounds = (date: Date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  // 🔥 LIVE PREDICTION GREY-OUT BASED ON CHECK-IN & CHECK-OUT RANGE
  useEffect(() => {
    const start = checkInDate || selectedDate || new Date();
    const end = checkOutDate || checkInDate || selectedDate || new Date();
    if (!start || !end) {
      setUnavailableRooms(new Set());
      return;
    }
    const rangeStart = new Date(start);
    const rangeEnd = new Date(end);
    if (rangeEnd < rangeStart) rangeEnd.setTime(rangeStart.getTime());
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd.setHours(23, 59, 59, 999);

    const bookingsRef = collection(db, 'bookings');
    const bookingsQuery = query(
      bookingsRef,
      where('check_in', '<=', Timestamp.fromDate(rangeEnd)),
      where('check_out', '>=', Timestamp.fromDate(rangeStart))
    );

    const mergeFromRtdbBookings = async (existing: Set<number>) => {
      try {
        const snap = await get(rtdbRef(rtdb, 'bookings'));
        const val = snap.val() || {};
        Object.values<any>(val).forEach((b: any) => {
          const status = (b?.status ?? '').toString().toLowerCase();
          if (status === 'checked_out' || status === 'checkedout') return;
          const roomNoRaw = b?.room_no ?? b?.roomNo;
          const roomNo = typeof roomNoRaw === 'number' ? roomNoRaw : Number(roomNoRaw);
          if (!roomNo) return;
          const bookingCheckIn = normalizeToDate(b?.checkInDate ?? b?.check_in ?? b?.checkIn);
          const bookingCheckOut = normalizeToDate(
            b?.checkOutDate ?? b?.check_out ?? b?.checkOut ?? b?.checkoutDate
          );
          if (!bookingCheckIn || !bookingCheckOut) return;
          const overlaps =
            bookingCheckIn.getTime() <= rangeEnd.getTime() &&
            bookingCheckOut.getTime() >= rangeStart.getTime();
          if (overlaps) existing.add(Number(roomNo));
        });
      } catch (err) {
        console.warn('RTDB bookings read failed; continuing with Firestore data.', err);
      }
      return existing;
    };

    const applyUnavailable = async (occupied: Set<number>) => {
      // Merge RTDB room flags (occupied/current_booking_id)
      rooms.forEach((room) => {
        if (room.is_available === false || room.current_booking_id) {
          occupied.add(room.room_no);
        }
      });
      setUnavailableRooms(occupied);
    };

    const unsub = onSnapshot(
      bookingsQuery,
      async (snap) => {
        const occupied = new Set<number>();

        snap.forEach((doc) => {
          const data = doc.data();
          if (!data) return;

          const status = (data.status ?? '').toString().toLowerCase();
          if (status === 'checked_out') return;

          const roomNo = Number(data.room_no ?? data.roomNo);
          if (!roomNo) return;

          occupied.add(roomNo);
        });

        const merged = await mergeFromRtdbBookings(occupied);
        applyUnavailable(merged);
      },
      async (error) => {
        console.warn('Firestore bookings subscription failed; falling back to RTDB.', error);
        const occupied = await mergeFromRtdbBookings(new Set<number>());
        applyUnavailable(occupied);
      }
    );

    return () => unsub();
  }, [checkInDate, checkOutDate, selectedDate, rooms]);

  useEffect(() => {
    // Auto-adjust selected rooms if any become unavailable
    setSelectedRooms((current) => {
      const valid = current.filter((room) => !isRoomUnavailable(room.room_no, room));
      if (valid.length > 0) return valid;
      const next = rooms.find((room) => !isRoomUnavailable(room.room_no, room));
      return next ? [next] : [];
    });
  }, [rooms, unavailableRooms]);

  // Helpers & web input refs for web date popup support
  const checkInInputRef = React.useRef<any>(null);
  const checkOutInputRef = React.useRef<any>(null);

  const toDateInputValue = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const openWebDateInput = (ref: React.RefObject<any>) => {
    if (ref && ref.current && typeof ref.current.click === 'function') ref.current.click();
  };

  const pickIdImage = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access to attach an ID image.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
        allowsEditing: true, // freeform crop
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const dataUri = await assetToDataUri(asset);
        if (dataUri) {
          setIdImageUrl(dataUri);
          setIdImageUrls((prev) => [...prev, dataUri]);
        }
      }
    } catch (err) {
      console.error('Image pick error', err);
      Alert.alert('Error', 'Unable to pick image');
    }
  };

  const pickIdImagesFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo access to attach ID images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
        allowsMultipleSelection: true,
        selectionLimit: 5,
        allowsEditing: true, // freeform crop
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris: string[] = [];
        for (const asset of result.assets) {
          const dataUri = await assetToDataUri(asset);
          if (dataUri) newUris.push(dataUri);
        }
        if (newUris.length > 0) {
          setIdImageUrl(newUris[0]); // keep first as primary
          setIdImageUrls((prev) => [...prev, ...newUris]);
        }
      }
    } catch (err) {
      console.error('Image pick error', err);
      Alert.alert('Error', 'Unable to pick images');
    }
  };

  const addManualImageUrl = () => {
    const trimmed = idImageUrl.trim();
    if (!trimmed) return;
    setIdImageUrls((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
  };

  const removeImageAt = (idx: number) => {
    setIdImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const assetToDataUri = async (asset: ImagePicker.ImagePickerAsset) => {
    const mime = asset.mimeType || 'image/jpeg';
    if (asset.base64) {
      return `data:${mime};base64,${asset.base64}`;
    }
    if (asset.uri) {
      try {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
        return `data:${mime};base64,${base64}`;
      } catch (e) {
        console.warn('Failed to read image as base64', e);
        return asset.uri;
      }
    }
    return null;
  };

  // Keep primary URL in sync with list for backward compatibility fields
  useEffect(() => {
    if (idImageUrls.length > 0) {
      setIdImageUrl(idImageUrls[0]);
    } else if (idImageUrl && idImageUrls.length === 0) {
      // keep manual single value
      setIdImageUrls([idImageUrl]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idImageUrls]);

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
    if (!amount.trim()) {
      Alert.alert('Missing Info', 'Amount is required');
      return false;
    }
    if (!idNumber.trim()) {
      Alert.alert('Missing Info', 'ID number is required');
      return false;
    }
    if (selectedRooms.length === 0) {
      Alert.alert('Missing Info', 'Please select at least one available room');
      return false;
    }
    // Use unified availability check (RTDB + Firestore)
    const invalid = selectedRooms.find((room) => isRoomUnavailable(room.room_no, room));
    if (invalid) {
      Alert.alert('Room occupied', `Room ${invalid.room_no} is already booked. Please pick another room.`);
      return false;
    }

    // Dates must be selected
    if (!checkInDate || !checkOutDate) {
      Alert.alert('Missing Info', 'Please select both check-in and check-out dates');
      return false;
    }

    // Check-out must not be earlier than check-in (equal allowed)
    if (checkOutDate < checkInDate) {
      Alert.alert('Invalid Dates', 'Check-out must be the same or after check-in');
      return false;
    }

    return true;
  };

  const handleCreateBooking = async () => {
    if (!validateForm() || selectedRooms.length === 0 || !checkInDate || !checkOutDate) return;

    const members = Number.parseInt(membersCount, 10) || 0;

    setIsSubmitting(true);
    try {
      const customerId = await createCustomer({
        guestName: guestName.trim(),
        fatherName: fatherName.trim() || undefined,
        mobileNumber: mobileNumber.trim(),
        address: address.trim() || undefined,
        city: undefined,
        amount: amount.trim(),
        idNumber: idNumber.trim(),
        membersCount: members,
        vehicleNumber: vehicleNumber.trim() || undefined,
        checkInDate: checkInDate.toISOString(),
        checkOutDate: checkOutDate.toISOString(),
        selectedRoom: selectedRooms.map((r) => r.room_no).join(','),
        idImageUrls,
        idImageUrl: idImageUrls[0] ?? idImageUrl ?? undefined,
      });

      for (const room of selectedRooms) {
        await createBooking(
          customerId,
          room.room_no.toString(),
          checkInDate.toISOString(),
          checkOutDate.toISOString()
        );
      }

      Alert.alert('Success', 'Booking created and saved successfully');
      resetForm();
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

  // Handlers for pickers:
  const onCheckInChange = (_event: any, date?: Date | undefined) => {
    setShowCheckInPicker(false);
    if (!date) return; // user dismissed
    if (checkOutDate && date > checkOutDate) {
      Alert.alert('Invalid Date', 'Check-in cannot be after the current check-out date.');
      return;
    }
    setSelectedDate(date);
    setCheckInDate(date);
    if (!checkOutDate) {
      setCheckOutDate(new Date(date.getTime() + 24 * 60 * 60 * 1000));
    }
  };

  const onCheckOutChange = (_event: any, date?: Date | undefined) => {
    setShowCheckOutPicker(false);
    if (!date) return; // user dismissed
    if (!checkInDate) {
      Alert.alert('Pick check-in first', 'Please select a check-in date before selecting check-out.');
      return;
    }
    if (date < checkInDate) {
      Alert.alert('Invalid Date', 'Check-out must not be earlier than the selected check-in date.');
      return;
    }
    setCheckOutDate(date);
  };

  // Web handlers for hidden date inputs
  const onWebCheckInChange = (e: any) => {
    const v = e.target.value; // YYYY-MM-DD
    if (!v) return;
    const d = new Date(v + 'T00:00:00');
    if (checkOutDate && d > checkOutDate) {
      setCheckInDate(d);
      setCheckOutDate(new Date(d.getTime() + 24 * 60 * 60 * 1000));
      setSelectedDate(d);
      window.alert('Selected check-in is after current check-out. Check-out moved to next day.');
    } else {
      setCheckInDate(d);
      setSelectedDate(d);
      if (!checkOutDate) setCheckOutDate(new Date(d.getTime() + 24 * 60 * 60 * 1000));
    }
  };

  const onWebCheckOutChange = (e: any) => {
    const v = e.target.value;
    if (!v) return;
    const d = new Date(v + 'T00:00:00');
    if (!checkInDate) {
      window.alert('Please choose a check-in date first.');
      return;
    }
    if (d < checkInDate) {
      window.alert('Check-out cannot be earlier than check-in.');
      return;
    }
    setCheckOutDate(d);
  };

  const handleSelectRoom = (room: RtdbRoom) => {
    if (isRoomUnavailable(room.room_no, room)) return;
    setSelectedRooms((current) => {
      const exists = current.find((r) => r.key === room.key);
      if (exists) {
        return current.filter((r) => r.key !== room.key);
      }
      return [...current, room];
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
            placeholderTextColor={placeholderColor}
            value={guestName}
            onChangeText={setGuestName}
          />
          <TextInput
            style={styles.input}
            placeholder="Father's Name"
            placeholderTextColor={placeholderColor}
            value={fatherName}
            onChangeText={setFatherName}
          />
          <TextInput
            style={styles.input}
            placeholder="Mobile Number *"
            placeholderTextColor={placeholderColor}
            value={mobileNumber}
            onChangeText={setMobileNumber}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Number of Members *"
            placeholderTextColor={placeholderColor}
            value={membersCount}
            onChangeText={setMembersCount}
            keyboardType="number-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Vehicle Number"
            placeholderTextColor={placeholderColor}
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
          />
          <TextInput
            style={styles.input}
            placeholder="Address"
            placeholderTextColor={placeholderColor}
            value={address}
            onChangeText={setAddress}
          />
        <TextInput
          style={styles.input}
          placeholder="Amount *"
          placeholderTextColor={placeholderColor}
          value={amount}
          onChangeText={setAmount}
          keyboardType="default"
        />

          <Text style={styles.sectionTitle}>ID Proof</Text>
          <TextInput style={styles.input} value="Aadhaar" editable={false} />
        <TextInput
          style={styles.input}
          placeholder="ID Number *"
          placeholderTextColor={placeholderColor}
          value={idNumber}
          onChangeText={setIdNumber}
          keyboardType="default"
        />
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="ID Image URL"
              placeholderTextColor={placeholderColor}
              value={idImageUrl}
              onChangeText={setIdImageUrl}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.addUrlButton} onPress={addManualImageUrl}>
              <Text style={styles.addUrlText}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.imageRow}>
            <TouchableOpacity style={styles.imageButton} onPress={pickIdImage}>
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={styles.imageButtonText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButtonSecondary} onPress={pickIdImagesFromLibrary}>
              <Ionicons name="images" size={18} color="#dc2626" />
              <Text style={styles.imageButtonTextSecondary}>Gallery</Text>
            </TouchableOpacity>
            {idImageUrls.length > 0 && (
              <Pressable
                onPress={() => {
                  setIdImageUrls([]);
                  setIdImageUrl('');
                }}
                style={styles.clearImageButton}
              >
                <Text style={styles.clearImageText}>Clear</Text>
              </Pressable>
            )}
          </View>
          {idImageUrls.length > 0 ? (
            <View style={styles.previewList}>
              {idImageUrls.map((uri, idx) => (
                <View key={idx} style={styles.previewItem}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <Pressable style={styles.removeThumb} onPress={() => removeImageAt(idx)}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Booking Details</Text>

          {/* Check-in Date Picker */}
          <TouchableOpacity
            style={styles.input}
            onPress={() => {
              if (Platform.OS === 'web') {
                openWebDateInput(checkInInputRef);
              } else {
                setShowCheckInPicker(true);
              }
            }}
          >
            <Text style={styles.inputText}>
              {checkInDate ? formatDate(checkInDate) : 'Select check-in date *'}
            </Text>
          </TouchableOpacity>

          {/* Hidden web inputs (only used on web) */}
          {Platform.OS === 'web' && (
            <>
              <input
                ref={(el) => {
                  // @ts-ignore
                  checkInInputRef.current = el;
                }}
                type="date"
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
                value={checkInDate ? toDateInputValue(checkInDate) : ''}
                onChange={onWebCheckInChange}
              />
              <input
                ref={(el) => {
                  // @ts-ignore
                  checkOutInputRef.current = el;
                }}
                type="date"
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
                value={checkOutDate ? toDateInputValue(checkOutDate) : ''}
                onChange={onWebCheckOutChange}
              />
            </>
          )}

          {/* Check-out Date Picker */}
          <TouchableOpacity
            style={styles.input}
            onPress={() => {
              if (Platform.OS === 'web') {
                openWebDateInput(checkOutInputRef);
              } else {
                setShowCheckOutPicker(true);
              }
            }}
          >
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
                const isUnavailable = isRoomUnavailable(room.room_no, room);
                const isSelected =
                  !isUnavailable && selectedRooms.some((selected) => selected.key === room.key);

                return (
                  <TouchableOpacity
                    key={room.key}
                    style={[
                      styles.roomCard,
                      isUnavailable && styles.roomCardUnavailable,
                      isSelected && styles.roomCardSelected,
                    ]}
                    onPress={() => handleSelectRoom(room)}
                    disabled={isUnavailable}
                >
                    {isUnavailable && (
                      <>
                        <View style={styles.unavailableStripe} />
                        <View style={styles.unavailableBadge}>
                          <Text style={styles.unavailableBadgeText}>Booked</Text>
                        </View>
                      </>
                    )}

                    <Text
                      style={[
                        styles.roomNumber,
                        isUnavailable && styles.roomTextUnavailable,
                      ]}
                    >
                      Room {room.room_no} – {room.type}
                      {room.room_no !== 302 && room.room_no !== 304 && (
                        <Text> – {room.beds} bed{room.beds === 1 ? '' : 's'}</Text>
                      )}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Date pickers — use fallback value when state is null */}
          {Platform.OS !== 'web' && showCheckInPicker && (
            <DateTimePicker
              testID="dateTimePickerCheckIn"
              value={checkInDate ?? new Date()}
              mode="date"
              display="calendar"
              onChange={onCheckInChange}
              maximumDate={new Date(2100, 11, 31)}
              minimumDate={new Date(1900, 0, 1)}
            />
          )}
          {Platform.OS !== 'web' && showCheckOutPicker && (
            <DateTimePicker
              testID="dateTimePickerCheckOut"
              value={checkOutDate ?? (checkInDate ?? new Date())}
              mode="date"
              display="calendar"
              onChange={onCheckOutChange}
              maximumDate={new Date(2100, 11, 31)}
              minimumDate={checkInDate ?? new Date(1900, 0, 1)}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  addUrlButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addUrlText: {
    color: '#fff',
    fontWeight: '700',
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  imageButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  imageButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  imageButtonTextSecondary: {
    color: '#dc2626',
    fontWeight: '600',
  },
  clearImageButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearImageText: {
    color: '#dc2626',
    fontWeight: '600',
  },
  previewImage: {
    marginTop: 8,
    height: 140,
    width: '100%',
    borderRadius: 8,
    resizeMode: 'contain',
    backgroundColor: '#f3f4f6',
  },
  previewList: {
    marginTop: 8,
    gap: 8,
  },
  previewItem: {
    position: 'relative',
  },
  removeThumb: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
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
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    position: 'relative',
  },
  roomCardUnavailable: {
    backgroundColor: '#E5E7EB',
    borderColor: '#9CA3AF',
    opacity: 0.95,
  },
  roomCardSelected: {
    borderColor: '#FBBF24',
    backgroundColor: '#D1FAE5',
  },
  roomInfo: {
    justifyContent: 'center',
  },
  roomNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  roomTextUnavailable: {
    color: '#4B5563',
  },
  unavailableBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#F97373',
    zIndex: 2,
  },
  unavailableBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  unavailableStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#9CA3AF',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    zIndex: 1,
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
