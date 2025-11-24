import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Room } from '../types';
import StatusBadge from './StatusBadge';

interface RoomCardProps {
  room: Room;
  onPress: () => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.roomNumber}>{room.room_number}</Text>
        <StatusBadge status={room.status} small />
      </View>
      <View style={styles.details}>
        <Text style={styles.type}>{room.type}</Text>
        <Text style={styles.info}>Capacity: {room.capacity}</Text>
        <Text style={styles.price}>₹{room.price_per_night}/night</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  details: {
    marginTop: 8,
  },
  type: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 4,
  },
  info: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginTop: 4,
  },
});

export default RoomCard;
