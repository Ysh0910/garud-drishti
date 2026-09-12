/**
 * Report History Card Component
 * Satisfies Task 5.1: Displays category, time, location, and verified status.
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { ReportResponse } from '../types/reports';
import { COLORS, getStatusColor, SPACING, RADIUS } from '../constants/theme';
import { formatCoordinates, formatDateTime } from '../utils/formatters';

interface ReportCardProps {
  report: ReportResponse;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report }) => {
  const statusColor = getStatusColor(report.status);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.categoryText}>{report.category.replace(/_/g, ' ')}</Text>
          <Text style={styles.timeText}>{formatDateTime(report.captured_at)}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{report.status}</Text>
        </View>
      </View>

      {report.description ? (
        <Text style={styles.description} numberOfLines={2}>
          "{report.description}"
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.locationText}>
          📍 {formatCoordinates(report.latitude, report.longitude)}
        </Text>

        {report.severity && (
          <Text style={styles.severityText}>
            Reported: <Text style={styles.severityBold}>{report.severity}</Text>
          </Text>
        )}
      </View>

      {report.media_url && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: report.media_url }} style={styles.previewImage} />
        </View>
      )}

      {report.status === 'VERIFIED' && (
        <View style={styles.verifiedNotice}>
          <Text style={styles.verifiedNoticeText}>
            ✅ Verified by District Disaster Management Authority
          </Text>
        </View>
      )}

      {report.status === 'REJECTED' && report.rejection_reason && (
        <View style={styles.rejectedNotice}>
          <Text style={styles.rejectedNoticeText}>
            ❌ Not actionable: {report.rejection_reason}
          </Text>
        </View>
      )}
    </View>
  );
};

ReportCard.displayName = 'ReportCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
  },
  statusText: {
    color: COLORS.textInverse,
    fontSize: 11,
    fontWeight: '800',
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: SPACING.md,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceMuted,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  severityText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  severityBold: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  imageContainer: {
    marginTop: SPACING.sm,
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceMuted,
  },
  verifiedNotice: {
    backgroundColor: '#E8F5E9',
    borderRadius: RADIUS.sm,
    padding: 6,
    marginTop: 8,
  },
  verifiedNoticeText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '700',
  },
  rejectedNotice: {
    backgroundColor: '#FFEBEE',
    borderRadius: RADIUS.sm,
    padding: 6,
    marginTop: 8,
  },
  rejectedNoticeText: {
    color: '#C62828',
    fontSize: 11,
  },
});
