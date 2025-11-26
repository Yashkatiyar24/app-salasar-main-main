import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import { fetchCustomerById } from '../../src/utils/rtdbService';

const CustomerDetailScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchCustomerById(id);
      setCustomer(data);
    } catch (error) {
      console.error('Error loading customer', error);
      Alert.alert('Error', 'Failed to load customer');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !customer) {
    return <LoadingSpinner message="Loading customer..." />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Customer Detail</Text>
      <View style={styles.card}>
        <InfoRow label="Name" value={customer.name} />
        <InfoRow label="Father's Name" value={customer.father_name} />
        <InfoRow label="Mobile" value={customer.mobile} />
        <InfoRow label="City" value={customer.city} />
        <InfoRow label="Address" value={customer.address} />
        <InfoRow label="Members" value={customer.membersCount} />
        <InfoRow label="Vehicle Number" value={customer.vehicleNumber} />
        <InfoRow label="ID Type" value={customer.id_type} />
        <InfoRow label="ID Number" value={customer.id_number} />
        {customer.idImageUrls && customer.idImageUrls.length > 0 ? (
          <View style={styles.imageWrapper}>
            <Text style={styles.imageLabel}>ID Images</Text>
            {customer.idImageUrls.map((uri: string, idx: number) => (
              <Image key={idx} source={{ uri }} style={styles.idImage} />
            ))}
          </View>
        ) : customer.idImageUrl ? (
          <View style={styles.imageWrapper}>
            <Text style={styles.imageLabel}>ID Image</Text>
            <Image source={{ uri: customer.idImageUrl }} style={styles.idImage} />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
};

const InfoRow = ({ label, value }: { label: string; value?: string | number }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '-'}</Text>
  </View>
);

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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
  imageWrapper: {
    marginTop: 12,
    gap: 6,
  },
  imageLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  idImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
    resizeMode: 'contain',
  },
});

export default CustomerDetailScreen;
