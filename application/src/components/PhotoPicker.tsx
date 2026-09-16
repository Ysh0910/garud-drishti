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
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>Evidence Photo</Text>
        <Text style={styles.requiredBadge}>* Camera Only</Text>
      </View>

      {photo ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
          <View style={styles.photoMeta}>
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>● LIVE CAMERA FIX</Text>
            </View>
            <Text style={styles.photoName} numberOfLines={1}>
              {photo.name || 'live_capture.jpg'}
            </Text>
            <Text style={styles.photoSub}>
              {formatDateTime(photo.capturedAt)}
              {photo.sizeBytes ? ` • ${(photo.sizeBytes / 1024).toFixed(0)} KB` : ''}
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handleOpenLiveCamera} style={styles.retakeBtn} activeOpacity={0.7}>
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRemovePhoto} style={styles.removeBtn} activeOpacity={0.7}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.pickerBox}
          onPress={handleOpenLiveCamera}
          activeOpacity={0.75}
        >
          <View style={styles.cameraIconContainer}>
            <Text style={styles.cameraIcon}>📸</Text>
          </View>
          <View style={styles.pickerTextCol}>
            <Text style={styles.pickerTitle}>Capture Field Photo</Text>
            <Text style={styles.pickerSub}>
              Live camera sensor • Geo-tagged evidence
            </Text>
          </View>
          <View style={styles.openPill}>
            <Text style={styles.openPillText}>Open</Text>
          </View>
        </TouchableOpacity>
      )}

      <Text style={styles.disclaimerText}>
        🛡️ Hardware camera only. Gallery uploads are disabled to ensure authentic ground-truth.
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
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  requiredBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  pickerBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderStyle: 'dashed',
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cameraIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cameraIcon: {
    fontSize: 18,
  },
  pickerTextCol: {
    flex: 1,
  },
  pickerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  pickerSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  openPill: {
    backgroundColor: '#0284C7',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
  },
  openPillText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  previewContainer: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.md,
    backgroundColor: '#0F172A',
  },
  photoMeta: {
    marginLeft: 12,
    flex: 1,
  },
  liveBadge: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  liveBadgeText: {
    color: '#047857',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  photoName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  photoSub: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  retakeBtn: {
    paddingVertical: 2,
  },
  retakeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  removeBtn: {
    paddingVertical: 2,
  },
  removeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  disclaimerText: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginTop: 6,
    lineHeight: 14,
  },
});
