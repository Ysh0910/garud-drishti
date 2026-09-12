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

type ReportScreenNavProp = StackNavigationProp<RootStackParamList, 'ReportHazard'>;
type ReportScreenRouteProp = RouteProp<RootStackParamList, 'ReportHazard'>;

export function ReportHazardScreen(): React.JSX.Element {
  const navigation = useNavigation<ReportScreenNavProp>();
  const route = useRoute<ReportScreenRouteProp>();

  // Form states
  const [category, setCategory] = useState<ReportCategory | null>(
    route.params?.preselectedCategory || null
  );
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<ReportSeverity>('MEDIUM');
  const [photo, setPhoto] = useState<PhotoAttachment | null>(null);

  // GPS state
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [isLocating, setIsLocating] = useState(true);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch initial GPS
  const acquireLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const res = await LocationService.getCurrentLocation();
      setLocation(res);
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
    if (!category) {
      Alert.alert('Required Field', 'Please select an incident category.');
      return;
    }

    if (!location) {
      Alert.alert('Location Required', 'Acquiring GPS location. Please wait a moment.');
      return;
    }

    setIsSubmitting(true);

    const clientReportId = generateUUID();
    const capturedAt = new Date().toISOString();

    const payload: ReportCreateRequest = {
      client_report_id: clientReportId,
      category,
      description: description.trim() || undefined,
      latitude: location.latitude,
      longitude: location.longitude,
      location_accuracy_m: location.accuracy_m,
      captured_at: capturedAt,
      severity,
      photo: photo || undefined,
    };

    const isOnline = NetworkService.getStatus();

    if (!isOnline) {
      // Offline mode: Enqueue to local storage immediately
      await ReportQueueManager.enqueue(payload);

      setIsSubmitting(false);
      navigation.replace('ReportConfirmation', {
        reportId: `QUEUED-${clientReportId.substring(0, 8)}`,
        clientReportId,
        capturedAt,
        category,
        latitude: location.latitude,
        longitude: location.longitude,
        isOfflineQueued: true,
      });
      return;
    }

    // Online mode: Submit to service
    try {
      const response = await reportService.submitReport(payload);
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
    } catch {
      // Network failed mid-upload: Enqueue for background retry
      await ReportQueueManager.enqueue(payload);

      setIsSubmitting(false);
      navigation.replace('ReportConfirmation', {
        reportId: `QUEUED-${clientReportId.substring(0, 8)}`,
        clientReportId,
        capturedAt,
        category,
        latitude: location.latitude,
        longitude: location.longitude,
        isOfflineQueued: true,
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Hazard Observation</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
        {/* Category Selector */}
        <CategorySelector
          selectedCategory={category}
          onSelectCategory={handleSelectCategory}
        />

        {/* GPS Location Component */}
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

        {/* Field Photo Attachment (Live Camera Only) */}
        <PhotoPicker photo={photo} onPhotoSelected={handlePhotoSelected} />

        {/* Severity Assessment */}
        <View style={styles.severitySection}>
          <Text style={styles.fieldLabel}>REPORTED OBSERVER SEVERITY</Text>
          <View style={styles.severityRow}>
            {(['LOW', 'MEDIUM', 'HIGH'] as ReportSeverity[]).map((sev) => {
              const isSelected = severity === sev;
              return (
                <TouchableOpacity
                  key={sev}
                  style={[
                    styles.severityBtn,
                    isSelected && styles.severityBtnSelected,
                  ]}
                  onPress={() => handleSeveritySelect(sev)}
                >
                  <Text
                    style={[
                      styles.severityBtnText,
                      isSelected && styles.severityBtnTextSelected,
                    ]}
                  >
                    {sev}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Description Input */}
        <View style={styles.inputSection}>
          <Text style={styles.fieldLabel}>DESCRIPTION / FIELD OBSERVATION (OPTIONAL)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="E.g., Visible widening crack along highway cutting; minor rock fragments falling..."
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={1000}
          />
          <Text style={styles.charCount}>{description.length}/1000</Text>
        </View>

        {/* Submit Action */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.textInverse} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Hazard Observation</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  severitySection: {
    marginVertical: SPACING.sm,
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  severityBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  severityBtnSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: COLORS.primaryLight,
  },
  severityBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  severityBtnTextSelected: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  inputSection: {
    marginVertical: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    minHeight: 90,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.textInverse,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

ReportHazardScreen.displayName = 'ReportHazardScreen';

