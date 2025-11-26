import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { fetchCustomers as fetchRtdbCustomers, subscribeToCustomers } from '../../src/utils/rtdbService';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';

type CustomerListItem = {
  id: string;
  name: string;
  mobile: string;
  city?: string;
  father_name?: string;
  address?: string;
  id_number?: string;
  id_type?: string;
  membersCount?: number;
  vehicleNumber?: string;
  createdAt?: number;
  checkInDate?: string;
  idImageUrl?: string;
};

type SortMode = 'recent' | 'month';
type MonthKey = string; // e.g. "2025-12"

const CustomersScreen = () => {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [selectedMonth, setSelectedMonth] = useState<MonthKey | 'all'>('all');
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const fetchCustomers = async () => {
    try {
      const customersData = await fetchRtdbCustomers();
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      alert('Failed to load customers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    const unsubscribe = subscribeToCustomers(
      (data) => setCustomers(data),
      (err) => console.error('Customer subscription error', err)
    );
    return () => unsubscribe();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCustomers();
  }, []);

  const renderCustomer = ({ item }: { item: CustomerListItem }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => router.push(`/customer-detail/${item.id}` as any)}
    >
      <View style={styles.avatar}>
        <Ionicons name="person" size={24} color="#fff" />
      </View>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name}</Text>
        <Text style={styles.customerMobile}>{item.mobile}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  const normalizeDate = (c: CustomerListItem) => {
    if (typeof c.createdAt === 'number') return new Date(c.createdAt);
    if (c.checkInDate) return new Date(c.checkInDate);
    return new Date(0);
  };

  const monthKey = (d: Date): MonthKey =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const monthLabel = (key: MonthKey) => {
    const [year, month] = key.split('-').map((v) => Number(v));
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => normalizeDate(b).getTime() - normalizeDate(a).getTime());
  }, [customers]);

  const monthGroups = useMemo(() => {
    const groups = new Map<MonthKey, CustomerListItem[]>();
    sortedCustomers.forEach((c) => {
      const d = normalizeDate(c);
      const key = monthKey(d);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(c);
    });
    const entries = Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    return entries.map(([key, items]) => ({
      key,
      title: `${monthLabel(key)} · ${items.length} bookings`,
      data: items,
    }));
  }, [sortedCustomers]);

  const monthOptions = useMemo(() => {
    return ['all', ...monthGroups.map((g) => g.key)];
  }, [monthGroups]);

  const filteredSections = useMemo(() => {
    if (sortMode === 'recent') {
      const data =
        selectedMonth === 'all'
          ? sortedCustomers
          : sortedCustomers.filter((c) => monthKey(normalizeDate(c)) === selectedMonth);
      return [{ key: 'recent', title: null, data }];
    }
    const sections =
      selectedMonth === 'all'
        ? monthGroups
        : monthGroups.filter((g) => g.key === selectedMonth);
    return sections;
  }, [sortMode, selectedMonth, sortedCustomers, monthGroups]);

  const renderSectionHeader = ({ section }: { section: any }) =>
    section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null;

  const currentMonthLabel =
    selectedMonth === 'all'
      ? 'All months'
      : monthLabel(selectedMonth);

  const sortLabel = sortMode === 'recent' ? 'Recently added' : 'By month';

  if (loading) {
    return <LoadingSpinner message="Loading customers..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.controlsRow}>
        <View style={styles.sortToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, sortMode === 'recent' && styles.toggleBtnActive]}
            onPress={() => setSortMode('recent')}
          >
            <Text style={[styles.toggleText, sortMode === 'recent' && styles.toggleTextActive]}>
              Recently added
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, sortMode === 'month' && styles.toggleBtnActive]}
            onPress={() => setSortMode('month')}
          >
            <Text style={[styles.toggleText, sortMode === 'month' && styles.toggleTextActive]}>
              By month
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterWrapper}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setMonthPickerOpen((v) => !v)}
          >
            <Ionicons name="calendar" size={16} color="#dc2626" />
            <Text style={styles.filterText}>{currentMonthLabel}</Text>
            <Ionicons
              name={monthPickerOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#6b7280"
            />
          </TouchableOpacity>
          {monthPickerOpen && (
            <View style={styles.dropdown}>
              {monthOptions.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedMonth(key as MonthKey | 'all');
                    setMonthPickerOpen(false);
                  }}
                >
                  <Text style={styles.dropdownText}>
                    {key === 'all' ? 'All months' : monthLabel(key)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <SectionList
        sections={filteredSections}
        renderItem={renderCustomer}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#dc2626']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No customers found</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/' as any)}
        accessibilityLabel="Go to dashboard"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  sortToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  toggleBtnActive: {
    backgroundColor: '#fee2e2',
  },
  toggleText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 13,
  },
  toggleTextActive: {
    color: '#dc2626',
  },
  filterWrapper: {
    position: 'relative',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  filterText: {
    color: '#111827',
    fontWeight: '600',
  },
  dropdown: {
    position: 'absolute',
    top: 46,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownText: {
    color: '#111827',
  },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  customerMobile: {
    fontSize: 14,
    color: '#6b7280',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
});

export default CustomersScreen;
