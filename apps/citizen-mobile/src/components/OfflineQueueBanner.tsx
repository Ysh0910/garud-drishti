/**
 * Offline Pending Reports Banner
 * Satisfies Task 4.1 & 4.2: Visualises queued unsent reports and triggers immediate retry sync.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { NetworkService } from '../services/networkService';

interface OfflineQueueBannerProps {
  pendingCount: number;
  onSyncComplete?: () => void;
}

export const OfflineQueueBanner: React.FC<OfflineQueueBannerProps> = ({
  pendingCount,
  onSyncComplete,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);

  if (pendingCount <= 0) return null;

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await NetworkService.syncPendingReports();
      if (onSyncComplete) onSyncComplete();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={styles.banner}>
      <View style={styles.textColumn}>
        <Text style={styles.bannerTitle}>
          📥 {pendingCount} Report{pendingCount > 1 ? 's' : ''} Queued Offline
        </Text>
        <Text style={styles.bannerSub}>
          Reports saved locally. Will upload when connectivity returns.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.syncButton}
        onPress={handleSyncNow}
        disabled={isSyncing}
        activeOpacity={0.8}
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color={COLORS.textInverse} />
        ) : (
          <Text style={styles.syncButtonText}>Sync Now</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

OfflineQueueBanner.displayName = 'OfflineQueueBanner';

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textColumn: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E65100',
  },
  bannerSub: {
    fontSize: 11,
    color: '#795548',
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: '#E65100',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    minWidth: 75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonText: {
    color: COLORS.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
});
