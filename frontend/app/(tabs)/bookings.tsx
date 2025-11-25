import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { get, ref } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { Booking } from '../../src/types';
import BookingItem from '../../src/components/BookingItem';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { normalizeBookingStatus } from '../../src/utils/rtdbService';

const BookingsScreen = () => {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBookings = async () => {
    try {
      const [bookingsSnap, customersSnap, roomsSnap] = await Promise.all([
        get(ref(rtdb, 'bookings')),
        get(ref(rtdb, 'customers')),
        get(ref(rtdb, 'rooms')),
      ]);

      const bookingsVal = bookingsSnap.val() || {};
      const customersVal = customersSnap.val() || {};
      const roomsVal = roomsSnap.val() || {};

      const mapped: Booking[] = Object.entries(bookingsVal).map(([id, value]: any) => {
        const booking = value as any;
        const customer = customersVal[booking.customerId];
        const roomKey = Object.keys(roomsVal).find(
          (key) => roomsVal[key].room_no?.toString() === booking.roomNo?.toString()
        );
        const roomData = roomKey ? roomsVal[roomKey] : null;
        const normalizedStatus = normalizeBookingStatus(booking.status);
        const roomAvailable = roomData?.is_available !== false && !roomData?.current_booking_id;

        return {
          id,
          customer_id: booking.customerId || '',
          room_id: roomKey || booking.roomNo || '',
          check_in: booking.checkInDate,
          check_out_expected: booking.checkOutDate || booking.checkoutDate,
          status: normalizedStatus,
          total_amount: 0,
          created_by: '',
          created_at: booking.createdAt ? new Date(booking.createdAt).toISOString() : '',
          customer: customer
            ? {
                id: booking.customerId,
                name: customer.name || 'Guest',
                father_name: customer.father_name || '',
                address: customer.address || '',
                city: customer.city || '',
                mobile: customer.phone || '',
                member_count: customer.member_count || 0,
                vehicle_number: customer.vehicle_number || '',
                id_type: customer.id_type || '',
                id_number_masked: customer.id_number || '',
                id_photo_base64: customer.id_image_url || '',
                created_at: customer.createdAt ? new Date(customer.createdAt).toISOString() : '',
              }
            : undefined,
          room: roomData
            ? {
                id: roomKey || booking.roomNo || '',
                room_number: roomData.room_no?.toString() || booking.roomNo || '',
                type: roomData.type || 'Room',
                capacity: roomData.beds || 1,
                price_per_night: 0,
                status: roomAvailable ? 'AVAILABLE' : 'OCCUPIED',
                current_booking_id: roomData.current_booking_id,
              }
            : undefined,
        };
      });

      const sorted = mapped.sort((a, b) => (a.created_at > b.created_at ? -1 : 1));

      setBookings(sorted);
      setFilteredBookings(sorted);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      alert('Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBookings(bookings);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = bookings.filter(
      (booking) =>
        booking.customer?.name.toLowerCase().includes(query) ||
        booking.room?.room_number.toLowerCase().includes(query)
    );
    setFilteredBookings(filtered);
  }, [searchQuery, bookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading bookings..." />;
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by guest name or room number"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        renderItem={({ item }) => (
          <BookingItem
            booking={item}
            onPress={() => router.push(`/booking-detail/${item.id}` as any)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#dc2626']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No bookings found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
});

export default BookingsScreen;
