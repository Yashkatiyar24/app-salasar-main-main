import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Booking } from '../types';
import StatusBadge from './StatusBadge';

interface BookingItemProps {
  booking: Booking;
  onPress: () => void;
}

const BookingItem: React.FC<BookingItemProps> = ({ booking, onPress }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.header}>
        <View>
          <Text style={styles.guestName}>{booking.customer?.name || 'Unknown Guest'}</Text>
          <Text style={styles.roomNumber}>Room: {booking.room?.room_number || 'N/A'}</Text>
        </View>
        <StatusBadge status={booking.status} small />
      </View>
      <View style={styles.dates}>
        <Text style={styles.dateText}>Check-in: {formatDate(booking.check_in)}</Text>
        <Text style={styles.dateText}>Check-out: {formatDate(booking.check_out_expected)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  guestName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  roomNumber: {
    fontSize: 14,
    color: '#6b7280',
  },
  dates: {
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
});

export default BookingItem;
