/**
 * My Reports & Observation History Screen
 * Satisfies Task 5.1: Displays submitted & queued hazard reports with live lifecycle statuses.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ReportCard } from '../components/ReportCard';
import { ReportResponse } from '../types/reports';
import { reportService } from '../services/reportService';
import { ReportQueueManager } from '../storage/reportQueue';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

export function MyReportsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const data = await reportService.getReports();
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports', error);
      const cached = await ReportQueueManager.getCachedReports();
      setReports(cached);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchReports();
    setIsRefreshing(false);
  };

  const filteredReports = reports.filter((r) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'PENDING') return r.status === 'PENDING' || r.status === 'REVIEW';
    if (selectedFilter === 'VERIFIED') return r.status === 'VERIFIED';
    if (selectedFilter === 'REJECTED') return r.status === 'REJECTED';
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Field Observations</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['ALL', 'PENDING', 'VERIFIED', 'REJECTED'].map((filter) => {
          const isSelected = selectedFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                isSelected && styles.filterTabSelected,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  isSelected && styles.filterTabTextSelected,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Reports List */}
      <FlatList
        data={filteredReports}
        keyExtractor={(item) => item.report_id || item.client_report_id}
        renderItem={({ item }) => <ReportCard report={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Reports Found</Text>
            <Text style={styles.emptySubtitle}>
              {selectedFilter === 'ALL'
                ? 'You have not submitted any hazard observations yet.'
                : `No reports currently under status "${selectedFilter}".`}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backButtonText: {
    color: COLORS.textInverse,
    fontWeight: '700',
    fontSize: 14,
  },
  headerTitle: {
    color: COLORS.textInverse,
    fontSize: 16,
    fontWeight: '800',
  },
  placeholder: {
    width: 48,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterTabSelected: {
    borderBottomWidth: 2.5,
    borderBottomColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  filterTabTextSelected: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 1.5,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
});

MyReportsScreen.displayName = 'MyReportsScreen';

