import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { subscribeToDashboardCounts } from '../../src/utils/rtdbService';
import { defaultRoomSeeds } from '../../src/utils/defaultRooms';
import { TOTAL_ROOMS } from '../../src/utils/roomConstants';

const DashboardScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalRooms: 0,
    availableRooms: 0,
    occupiedRooms: 0,
    occupiedRoomNos: [] as number[],
  });

  useFocusEffect(
    useCallback(() => {
      const fallback = () => {
        // Use the authoritative TOTAL_ROOMS count even when RTDB isn't available.
        const total = TOTAL_ROOMS;
        setStats({
          totalRooms: total,
          availableRooms: total,
          occupiedRooms: 0,
          occupiedRoomNos: [],
        });
        setLoading(false);
        setRefreshing(false);
      };

      const unsubscribe = subscribeToDashboardCounts(
        (data) => {
          setStats(data);
          setLoading(false);
          setRefreshing(false);
        },
        () => {
          fallback();
        }
      );
      return () => unsubscribe();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#dc2626']} />
      }
    >
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
          <Ionicons name="home" size={32} color="#1e40af" />
          <Text style={styles.statNumber}>{stats.totalRooms}</Text>
          <Text style={styles.statLabel}>Total Rooms</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
          <Ionicons name="checkmark-circle" size={32} color="#065f46" />
          <Text style={styles.statNumber}>{stats.availableRooms}</Text>
          <Text style={styles.statLabel}>Available Rooms</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
          <Ionicons name="bed" size={32} color="#991b1b" />
          <Text style={styles.statNumber}>{stats.occupiedRooms}</Text>
          <Text style={styles.statLabel}>Occupied Rooms</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
          <Ionicons name="list" size={32} color="#92400e" />
          <Text style={styles.statNumber}>{stats.occupiedRoomNos.length}</Text>
          <Text style={styles.statLabel}>Rooms In Use</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/new-booking' as any)}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>New Booking / Check-in</Text>
        </TouchableOpacity>
      </View>

      {stats.occupiedRoomNos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Currently Occupied</Text>
          <Text style={styles.bookingRoom}>
            Rooms: {stats.occupiedRoomNos.sort((a, b) => a - b).join(', ')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingGuest: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  bookingRoom: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default DashboardScreen;
