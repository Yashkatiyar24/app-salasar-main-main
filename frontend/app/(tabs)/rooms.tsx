import React, { useState, useCallback, useEffect } from 'react';
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
import { fetchAllRooms, subscribeToRooms, RtdbRoom } from '../../src/utils/rtdbService';
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
    status: room.is_available !== false && !room.current_booking_id ? 'AVAILABLE' : 'OCCUPIED',
    ac_make: room.ac_make,
    remarks: room.remarks,
    current_booking_id: room.current_booking_id ?? undefined,
  });

  const mergeWithSeeds = (live: RtdbRoom[]): RtdbRoom[] => {
    const seedMap = new Map<number, RtdbRoom>();
    defaultRoomSeeds.slice(0, TOTAL_ROOMS).forEach((seed) => {
      const roomNo = Number(seed.room_number);
      seedMap.set(
        roomNo,
        mapSeedToRtdbRoom(seed, seed.room_number)
      );
    });

    live.forEach((room) => {
      seedMap.set(room.room_no, {
        ...room,
        is_available: room.is_available !== false,
      });
    });

    return Array.from(seedMap.values()).sort((a, b) => a.room_no - b.room_no);
  };

  const fetchRooms = async () => {
    try {
      const fetched = await fetchAllRooms();
      const merged = mergeWithSeeds(fetched);
      setRooms(merged);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms(mergeWithSeeds([]));
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

  useEffect(() => {
    const unsubscribe = subscribeToRooms(
      (liveRooms) => {
        const merged = mergeWithSeeds(liveRooms);
        setRooms(merged);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Room subscription error', error);
      }
    );
    return () => unsubscribe();
  }, []);

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
            onPress={() => router.push('/dashboard' as any)}
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
          onPress={() => router.push('/dashboard' as any)}
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
