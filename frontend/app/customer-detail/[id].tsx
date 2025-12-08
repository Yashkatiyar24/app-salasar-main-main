import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, TextInput, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import { fetchCustomerById, updateCustomer, deleteCustomer } from '../../src/utils/rtdbService';
import { useAuth } from '../../src/context/AuthContext';

const CustomerDetailScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const { profile } = useAuth();
  const isAdmin =
    profile?.role === 'ADMIN' ||
    (profile?.full_name || '').trim().toLowerCase() === 'sarita rohilla' ||
    (profile?.email || '').trim().toLowerCase() === 'sarita@salasar.com';

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

  const handleSave = async () => {
    if (!id || !customer) return;
    try {
      await updateCustomer(id, {
        guestName: customer.name,
        fatherName: customer.father_name,
        mobileNumber: customer.mobile,
        address: customer.address,
        amount: customer.amount,
        membersCount: customer.membersCount ? Number(customer.membersCount) : undefined,
        vehicleNumber: customer.vehicleNumber,
        idNumber: customer.id_number,
        idImageUrl: customer.idImageUrl,
        idImageUrls: customer.idImageUrls,
      });
      Alert.alert('Saved', 'Customer updated');
      setEditing(false);
      load();
    } catch (err) {
      console.error('Update error', err);
      Alert.alert('Error', 'Failed to save customer');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    Alert.alert('Delete Customer', 'Are you sure you want to delete this customer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCustomer(id);
            Alert.alert('Deleted', 'Customer removed');
            router.back();
          } catch (err) {
            console.error('Delete error', err);
            Alert.alert('Error', 'Failed to delete customer');
          }
        },
      },
    ]);
  };

  if (loading || !customer) {
    return <LoadingSpinner message="Loading customer..." />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Customer Detail</Text>
      <View style={styles.card}>
        <InfoInput label="Name" value={customer.name} editable={isAdmin && editing} onChange={(v) => setCustomer({ ...customer, name: v })} />
        <InfoInput label="Father's Name" value={customer.father_name} editable={isAdmin && editing} onChange={(v) => setCustomer({ ...customer, father_name: v })} />
        <InfoInput label="Mobile" value={customer.mobile} editable={isAdmin && editing} onChange={(v) => setCustomer({ ...customer, mobile: v })} />
        <InfoInput label="Amount" value={customer.amount} editable={isAdmin && editing} onChange={(v) => setCustomer({ ...customer, amount: v })} />
        <InfoInput label="Address" value={customer.address} editable={isAdmin && editing} onChange={(v) => setCustomer({ ...customer, address: v })} />
        <InfoInput label="Members" value={customer.membersCount} editable={isAdmin && editing} onChange={(v) => setCustomer({ ...customer, membersCount: v })} />
        <InfoInput label="Vehicle Number" value={customer.vehicleNumber} editable={isAdmin && editing} onChange={(v) => setCustomer({ ...customer, vehicleNumber: v })} />
        <InfoInput label="ID Type" value={customer.id_type} editable={isAdmin && editing} onChange={(v) => setCustomer({ ...customer, id_type: v })} />
        <InfoInput label="ID Number" value={customer.id_number} editable={isAdmin && editing} onChange={(v) => setCustomer({ ...customer, id_number: v })} keyboardType="default" />
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

      {isAdmin ? (
        <View style={styles.actionsRow}>
          {!editing ? (
            <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => setEditing(true)}>
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={handleSave}>
              <Text style={styles.actionText}>Save</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDelete}>
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
};

const InfoInput = ({
  label,
  value,
  editable,
  onChange,
  keyboardType,
}: {
  label: string;
  value?: string | number;
  editable: boolean;
  onChange: (v: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
}) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    {editable ? (
      <TextInput
        style={styles.infoInput}
        value={value?.toString() || ''}
        onChangeText={onChange}
        keyboardType={keyboardType || 'default'}
      />
    ) : (
      <Text style={styles.infoValue}>{value || '-'}</Text>
    )}
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
  infoInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 180,
    color: '#111827',
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
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
  },
  editBtn: {
    backgroundColor: '#f59e0b',
  },
  saveBtn: {
    backgroundColor: '#10b981',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default CustomerDetailScreen;
