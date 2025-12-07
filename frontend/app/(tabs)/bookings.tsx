import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { get, ref } from 'firebase/database';
import { rtdb } from '../../src/firebase/firebase';
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
  const [selectedMonth, setSelectedMonth] = useState<string>('recent');

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

        const amountVal = customer?.city || customer?.amount || '';
        const parsedAmount = Number(amountVal) || 0;
        return {
          id,
          customer_id: booking.customerId || '',
          room_id: roomKey || booking.roomNo || '',
          check_in: booking.checkInDate,
          check_out_expected: booking.checkOutDate || booking.checkoutDate,
          check_out_actual: booking.checkOutActual || booking.checkoutDate,
          status: normalizedStatus,
          total_amount: parsedAmount,
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
      // Group by customer so multiple rooms booked by same guest appear in one entry
      const groupedMap = new Map<string, Booking & { room_numbers: string[] }>();
      for (const b of sorted) {
        const key = b.customer_id || b.id;
        const roomNo = b.room?.room_number || b.room_id?.toString() || '';
        const existing = groupedMap.get(key);
        if (existing) {
          if (roomNo && !existing.room_numbers.includes(roomNo)) existing.room_numbers.push(roomNo);
          // keep the most recent entry (sorted already), so no other fields change
        } else {
          groupedMap.set(key, { ...b, room_numbers: roomNo ? [roomNo] : [] });
        }
      }
      const grouped = Array.from(groupedMap.values());

      setBookings(grouped);
      setFilteredBookings(grouped);
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

  const normalizeToDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value.toDate) {
      try {
        return value.toDate();
      } catch {}
    }
    if (typeof value === 'string') {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
  };

  const filterBySearch = useCallback(
    (list: Booking[]) => {
      if (!searchQuery.trim()) return list;
      const query = searchQuery.toLowerCase();
      return list.filter(
        (booking) =>
          booking.customer?.name?.toLowerCase().includes(query) ||
          booking.room_numbers?.some((rn) => rn.toLowerCase().includes(query)) ||
          booking.room?.room_number?.toLowerCase().includes(query)
      );
    },
    [searchQuery]
  );

  const filterByMonth = useCallback(
    (list: Booking[]) => {
      if (selectedMonth === 'recent') return list;
      const [month, year] = selectedMonth.split('-').map((v) => Number(v));
      return list.filter((booking) => {
        const d =
          normalizeToDate((booking as any).check_in) ||
          normalizeToDate((booking as any).checkInDate) ||
          normalizeToDate(booking.created_at);
        if (!d) return false;
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
    },
    [selectedMonth]
  );

  useEffect(() => {
    const base = filterByMonth(bookings);
    const filtered = filterBySearch(base);
    setFilteredBookings(filtered);
  }, [bookings, filterByMonth, filterBySearch]);

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    bookings.forEach((b) => {
      const d =
        normalizeToDate((b as any).check_in) ||
        normalizeToDate((b as any).checkInDate) ||
        normalizeToDate(b.created_at);
      if (!d) return;
      const key = `${d.getMonth() + 1}-${d.getFullYear()}`;
      months.add(key);
    });
    return Array.from(months.values()).sort((a, b) => {
      const [ma, ya] = a.split('-').map(Number);
      const [mb, yb] = b.split('-').map(Number);
      if (ya === yb) return mb - ma; // descending month
      return yb - ya; // descending year
    });
  }, [bookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading bookings..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, selectedMonth === 'recent' && styles.filterChipActive]}
          onPress={() => setSelectedMonth('recent')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedMonth === 'recent' && styles.filterChipTextActive,
            ]}
          >
            Recently added
          </Text>
        </TouchableOpacity>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {monthOptions.map((key) => {
            const [m, y] = key.split('-').map(Number);
            const label = new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
            const active = selectedMonth === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedMonth(key)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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
  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  filterChipActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  filterChipText: {
    color: '#4b5563',
    fontSize: 14,
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default BookingsScreen;
