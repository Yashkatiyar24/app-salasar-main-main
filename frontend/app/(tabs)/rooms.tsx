import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Room } from '../../src/types';
import RoomCard from '../../src/components/RoomCard';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchAllRooms, RtdbRoom } from '../../src/utils/rtdbService';
import { TOTAL_ROOMS } from '../../src/utils/roomConstants';
import { defaultRoomSeeds } from '../../src/utils/defaultRooms';

const RoomsScreen = () => {
  const router = useRouter();
  const { profile } = useAuth();
  const [rooms, setRooms] = useState<RtdbRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const mapSeedToRtdbRoom = (seed: any, key?: string): RtdbRoom => ({
    key: key || seed.room_number,
    room_no: Number(seed.room_number),
    beds: seed.capacity ?? 1,
    type: seed.type,
    ac_make: seed.ac_make,
    remarks: seed.remarks,
    is_available: seed.status ? seed.status === 'AVAILABLE' : true,
    current_booking_id: seed.current_booking_id,
  });

  const mapRtdbRoomToRoomCard = (room: RtdbRoom): Room => ({
    id: room.key,
    room_number: room.room_no.toString(),
    type: room.type,
    capacity: room.beds,
    price_per_night: 0,
    status: room.is_available ? 'AVAILABLE' : 'OCCUPIED',
    ac_make: room.ac_make,
    remarks: room.remarks,
    current_booking_id: room.current_booking_id ?? undefined,
  });

  const fetchRooms = async () => {
    try {
      const fetched = await fetchAllRooms();
      const sorted = fetched.sort((a, b) => a.room_no - b.room_no);
      setRooms(sorted);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      const mapped = defaultRoomSeeds
        .slice(0, TOTAL_ROOMS)
        .map((seed) => mapSeedToRtdbRoom(seed, seed.room_number))
        .sort((a, b) => a.room_no - b.room_no);
      setRooms(mapped);
      alert('Offline or permission denied. Showing local room list (not synced).');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRooms();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRooms();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading rooms..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rooms}
        renderItem={({ item }) => (
          <RoomCard
            room={mapRtdbRoomToRoomCard(item)}
            onPress={() => router.push(`/room-detail/${item.key}` as any)}
          />
        )}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#dc2626']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bed-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No rooms found</Text>
          </View>
        }
      />

      {/* Admin: Add Room Button */}
      {profile?.role === 'ADMIN' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/room-detail/new' as any)}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  listContent: {
    padding: 16,
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});

export default RoomsScreen;
