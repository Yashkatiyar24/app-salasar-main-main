import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import { fetchBookingById, handleCheckout as rtdbHandleCheckout, BookingDetail } from '../../src/utils/rtdbService';

const BookingDetailScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchBookingById(id);
      setBooking(data);
    } catch (error) {
      console.error('Error loading booking', error);
      Alert.alert('Error', 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCheckout = async () => {
    if (!id) return;
    setCheckingOut(true);
    try {
      await rtdbHandleCheckout(id);
      Alert.alert('Checked out', 'Booking checked out and room is now available.');
      // Navigate back to dashboard to refresh visible stats and occupied list
      router.push('/' as any);
    } catch (error: any) {
      console.error('Checkout error', error);
      Alert.alert('Error', error?.message || 'Failed to check out');
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading || !booking) {
    return <LoadingSpinner message="Loading booking..." />;
  }

  const isActive = booking.status === 'BOOKED';
  const roomsLabel =
    booking.roomNumbers && booking.roomNumbers.length > 0
      ? booking.roomNumbers.join(', ')
      : booking.roomNo;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Booking Detail</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Guest</Text>
        <InfoRow label="Name" value={booking.customer?.name || 'Guest'} />
        <InfoRow label="Mobile" value={booking.customer?.mobile || '-'} />
        <InfoRow label="Amount" value={booking.customer?.city || '-'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Room</Text>
        <InfoRow label="Room No" value={roomsLabel} />
        <InfoRow label="Type" value={booking.room?.type || '-'} />
        <InfoRow
          label="Status"
          value={isActive ? 'Booked / Occupied' : 'Checked Out'}
          valueStyle={{ color: isActive ? '#dc2626' : '#10b981' }}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Stay</Text>
        <InfoRow label="Check-in" value={formatDate(booking.checkInDate)} />
        <InfoRow label="Check-out expected" value={formatDate(booking.checkOutDate)} />
        <InfoRow label="Check-out actual" value={formatDate(booking.checkOutActual)} />
      </View>

      {isActive && (
        <TouchableOpacity
          style={[styles.button, checkingOut && styles.buttonDisabled]}
          onPress={handleCheckout}
          disabled={checkingOut}
        >
          <Text style={styles.buttonText}>{checkingOut ? 'Checking out...' : 'Check Out'}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const InfoRow = ({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value?: string | number | null;
  valueStyle?: any;
}) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, valueStyle]}>{value || '-'}</Text>
  </View>
);

const formatDate = (iso?: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  infoValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    marginTop: 12,
    backgroundColor: '#dc2626',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default BookingDetailScreen;
