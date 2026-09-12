/**
 * Field Observation Photo Capture Component
 * Satisfies Task 2.4: Captures real-time camera photos only (never gallery imports)
 * with explicit device permissions and preview metadata.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { PhotoAttachment } from '../types/reports';
import { LiveCameraModal } from './LiveCameraModal';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { formatDateTime } from '../utils/formatters';

interface PhotoPickerProps {
  photo: PhotoAttachment | null;
  onPhotoSelected: (photo: PhotoAttachment | null) => void;
}

export const PhotoPicker: React.FC<PhotoPickerProps> = ({
  photo,
  onPhotoSelected,
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const handleOpenLiveCamera = () => {
    setIsCameraOpen(true);
  };

  const handleCapturedPhoto = (captured: PhotoAttachment) => {
    onPhotoSelected(captured);
  };

  const handleRemovePhoto = () => {
    onPhotoSelected(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>LIVE EVIDENCE PHOTO (CAMERA ONLY) *</Text>

      {photo ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
          <View style={styles.photoMeta}>
            <View style={styles.badgeRow}>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>● LIVE CAMERA FIX</Text>
              </View>
            </View>
            <Text style={styles.photoName} numberOfLines={1}>
              {photo.name || 'live_capture.jpg'}
            </Text>
            <Text style={styles.photoSub}>
              Captured: {formatDateTime(photo.capturedAt)}
            </Text>
            {photo.sizeBytes && (
              <Text style={styles.sizeText}>
                Size: {(photo.sizeBytes / 1024).toFixed(0)} KB
              </Text>
            )}
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handleOpenLiveCamera} style={styles.retakeBtn}>
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRemovePhoto} style={styles.removeBtn}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.pickerBox}
          onPress={handleOpenLiveCamera}
          activeOpacity={0.7}
        >
          <View style={styles.cameraIconContainer}>
            <Text style={styles.cameraIcon}>📸</Text>
          </View>
          <Text style={styles.pickerTitle}>Open Live Camera & Capture</Text>
          <Text style={styles.pickerSub}>
            Requests camera permission • Live sensor capture only
          </Text>
          <View style={styles.liveOnlyPill}>
            <Text style={styles.liveOnlyText}>✓ Anti-Fraud: Direct Camera Feed</Text>
          </View>
        </TouchableOpacity>
      )}

      <Text style={styles.disclaimerText}>
        🛡️ Live photographs provide verifiable field ground-truth for disaster authorities. Gallery/file uploads are disabled to prevent stale reports.
      </Text>

      {/* Live Viewfinder Modal */}
      <LiveCameraModal
        visible={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCapturedPhoto}
      />
    </View>
  );
};

PhotoPicker.displayName = 'PhotoPicker';

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  pickerBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: '#90CAF9',
    borderStyle: 'dashed',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cameraIcon: {
    fontSize: 26,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryLight,
  },
  pickerSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  liveOnlyPill: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    marginTop: 8,
  },
  liveOnlyText: {
    color: COLORS.online,
    fontSize: 11,
    fontWeight: '700',
  },
  previewContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
  },
  photoMeta: {
    flex: 1,
    minWidth: 0,
    marginLeft: SPACING.md,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  liveBadge: {
    backgroundColor: '#FFEBEE',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: RADIUS.sm,
  },
  liveBadgeText: {
    color: '#C62828',
    fontSize: 10,
    fontWeight: '800',
  },
  photoName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  photoSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sizeText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 12,
  },
  retakeBtn: {
    alignSelf: 'flex-start',
  },
  retakeText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  removeBtn: {
    alignSelf: 'flex-start',
  },
  removeText: {
    color: COLORS.riskCritical,
    fontSize: 12,
    fontWeight: '700',
  },
  disclaimerText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
    lineHeight: 15,
  },
});
