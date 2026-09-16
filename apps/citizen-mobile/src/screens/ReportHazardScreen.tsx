/**
 * Hazard Report Creation Screen
 * Satisfies Tasks 2.2, 2.3, 2.4, 3.1, 4.1, 6.1
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { CategorySelector } from '../components/CategorySelector';
import { LocationBadge } from '../components/LocationBadge';
import { PhotoPicker } from '../components/PhotoPicker';
import { ReportCategory, ReportSeverity } from '../types/enums';
import { PhotoAttachment, ReportCreateRequest } from '../types/reports';
import { LocationService, LocationResult } from '../services/locationService';
import { reportService } from '../services/reportService';
import { ReportQueueManager } from '../storage/reportQueue';
import { NetworkService } from '../services/networkService';
import { generateUUID } from '../utils/id';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

type ReportScreenNavProp = StackNavigationProp<RootStackParamList, 'ReportHazard'>;
type ReportScreenRouteProp = RouteProp<RootStackParamList, 'ReportHazard'>;

export function ReportHazardScreen(): React.JSX.Element {
  const navigation = useNavigation<ReportScreenNavProp>();
  const route = useRoute<ReportScreenRouteProp>();

  // Form states - default to ROCKFALL for immediate usability
  const [category, setCategory] = useState<ReportCategory>(
    route.params?.preselectedCategory || 'ROCKFALL'
  );
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<ReportSeverity>('MEDIUM');
  const [photo, setPhoto] = useState<PhotoAttachment | null>(null);

  // GPS state
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [isLocating, setIsLocating] = useState(true);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch initial GPS with instant fallback
  const acquireLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const res = await LocationService.getCurrentLocation();
      setLocation(res);
    } catch {
      const fallbackArea = LocationService.getRegionalAreaDetails(
        APP_CONFIG.defaultLocation.latitude,
        APP_CONFIG.defaultLocation.longitude,
      );
      setLocation({
        success: true,
        latitude: APP_CONFIG.defaultLocation.latitude,
        longitude: APP_CONFIG.defaultLocation.longitude,
        timestamp: new Date().toISOString(),
        isMockFallback: true,
        areaDetails: fallbackArea,
      });
    } finally {
      setIsLocating(false);
    }
  }, []);

  useEffect(() => {
    acquireLocation();
  }, [acquireLocation]);

  const handleSelectCategory = useCallback((cat: ReportCategory) => {
    setCategory(cat);
  }, []);

  const handlePhotoSelected = useCallback((p: PhotoAttachment | null) => {
    setPhoto(p);
  }, []);

  const handleSeveritySelect = useCallback((sev: ReportSeverity) => {
    setSeverity(sev);
  }, []);

  const handleSubmit = async () => {
    const lat = location?.latitude || APP_CONFIG.defaultLocation.latitude;
    const lon = location?.longitude || APP_CONFIG.defaultLocation.longitude;
    const accuracy = location?.accuracy_m || APP_CONFIG.defaultLocation.accuracy_m;

    setIsSubmitting(true);
    const clientReportId = generateUUID();
    const capturedAt = new Date().toISOString();

    const payload: ReportCreateRequest = {
      client_report_id: clientReportId,
      category: category || 'ROCKFALL',
      description: description.trim() || undefined,
      latitude: lat,
      longitude: lon,
      location_accuracy_m: accuracy,
      captured_at: capturedAt,
      severity,
      photo: photo || undefined,
    };

    console.log('[ReportHazardScreen] Submitting observation to backend:', payload);

    const isOnline = NetworkService.getStatus();

    if (!isOnline) {
      console.log('[ReportHazardScreen] Network offline, enqueuing locally...');
      await ReportQueueManager.enqueue(payload);
      setIsSubmitting(false);
      navigation.replace('ReportConfirmation', {
        reportId: `QUEUED-${clientReportId.substring(0, 8)}`,
        clientReportId,
        capturedAt,
        category: payload.category,
        latitude: lat,
        longitude: lon,
        isOfflineQueued: true,
      });
      return;
    }

    try {
      console.log('[ReportHazardScreen] Sending HTTP POST to backend...');
      const response = await reportService.submitReport(payload);
      console.log('[ReportHazardScreen] Received backend confirmation:', response);
      setIsSubmitting(false);

      navigation.replace('ReportConfirmation', {
        reportId: response.report_id,
        clientReportId: response.client_report_id,
        capturedAt: response.captured_at,
        category: response.category,
        latitude: response.latitude,
        longitude: response.longitude,
        isOfflineQueued: false,
      });
    } catch (err) {
      console.warn('[ReportHazardScreen] Direct upload failed, queuing for retry:', err);
      await ReportQueueManager.enqueue(payload);
      setIsSubmitting(false);

      navigation.replace('ReportConfirmation', {
        reportId: `QUEUED-${clientReportId.substring(0, 8)}`,
        clientReportId,
        capturedAt,
        category: payload.category,
        latitude: lat,
        longitude: lon,
        isOfflineQueued: true,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>New Incident Observation</Text>
          <Text style={styles.headerSubtitle}>Field Hazard Report</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Category Selector */}
        <CategorySelector
          selectedCategory={category}
          onSelectCategory={handleSelectCategory}
        />

        {/* 2. GPS Location Component */}
        <LocationBadge
          latitude={location?.latitude ?? 0}
          longitude={location?.longitude ?? 0}
          accuracyM={location?.accuracy_m}
          isLoading={isLocating}
          isMockFallback={location?.isMockFallback}
          errorMessage={location?.errorMessage}
          areaDetails={location?.areaDetails}
          onRefresh={acquireLocation}
        />

        {/* 3. Field Photo Attachment (Live Camera Only) */}
        <PhotoPicker photo={photo} onPhotoSelected={handlePhotoSelected} />

        {/* 4. Severity Assessment */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Observer Severity</Text>
            <Text style={styles.sectionHint}>Estimated impact</Text>
          </View>
          <View style={styles.severityRow}>
            {(
              [
                { id: 'LOW', label: 'Low', color: '#047857', bg: '#ECFDF5', border: '#A7F3D0' },
                { id: 'MEDIUM', label: 'Medium', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
                { id: 'HIGH', label: 'High', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
              ] as const
            ).map((sev) => {
              const isSelected = severity === sev.id;
              return (
                <TouchableOpacity
                  key={sev.id}
                  style={[
                    styles.severityBtn,
                    isSelected && {
                      backgroundColor: sev.bg,
                      borderColor: sev.border,
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => handleSeveritySelect(sev.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.severityBtnText,
                      isSelected && {
                        color: sev.color,
                        fontWeight: '800',
                      },
                    ]}
                  >
                    {sev.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 5. Description Input */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Field Notes</Text>
            <Text style={styles.sectionHint}>Optional</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="E.g., Tension crack widening along roadside; minor rock debris on pavement..."
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={1000}
          />
          <Text style={styles.charCount}>{description.length}/1000</Text>
        </View>

        {/* 6. Submit Action */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.textInverse} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Hazard Observation →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#0F172A',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButtonText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
  titleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  placeholder: {
    width: 54,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionHeaderRow: {
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
  sectionHint: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  severityBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 10,
    fontSize: 13,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    minHeight: 72,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  charCount: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: 3,
  },
  submitButton: {
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

ReportHazardScreen.displayName = 'ReportHazardScreen';
