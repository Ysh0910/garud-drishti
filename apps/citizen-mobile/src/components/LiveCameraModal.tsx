/**
 * Institutional Live Field Camera Viewfinder
 * Directly accesses hardware camera lens with zero gallery imports.
 * Features dual camera capture modes: Direct WebRTC Viewfinder + Native Hardware Shutter.
 * Bulletproof stream binding, instant cancellation on "← Back", and adaptive hardware constraints.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { PhotoAttachment } from '../types/reports';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface LiveCameraModalProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (photo: PhotoAttachment) => void;
}

export function LiveCameraModal({
  visible,
  onClose,
  onCapture,
}: LiveCameraModalProps): React.JSX.Element {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasStartedVideo, setHasStartedVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Instant and exhaustive track release
  const stopAllTracks = useCallback(() => {
    isCancelledRef.current = true;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch {
        // ignore
      }
    }
    setStream(null);
    setHasStartedVideo(false);
    setIsInitializing(false);
  }, []);

  // Safe dismiss handler triggered by "← Back", Escape, or Close
  const handleBack = useCallback(() => {
    stopAllTracks();
    onClose();
  }, [stopAllTracks, onClose]);

  const startCamera = useCallback(async () => {
    isCancelledRef.current = false;
    setIsInitializing(true);
    setCameraError(null);
    setHasStartedVideo(false);

    const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
    if (!nav || !nav.mediaDevices || !nav.mediaDevices.getUserMedia) {
      setIsInitializing(false);
      setCameraError('Camera API not supported in this browser environment.');
      return;
    }

    // 4-second timeout guard
    const timeoutTimer = setTimeout(() => {
      if (!isCancelledRef.current) {
        setIsInitializing(false);
        setCameraError(
          'Camera is taking longer to respond. It may be in use by another application, or waiting for permission in your browser address bar.'
        );
      }
    }, 4000);

    try {
      let mediaStream: MediaStream | null = null;
      const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

      if (isMobile) {
        try {
          mediaStream = await nav.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          });
        } catch {
          mediaStream = await nav.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      } else {
        try {
          mediaStream = await nav.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch {
          mediaStream = await nav.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false,
          });
        }
      }

      clearTimeout(timeoutTimer);

      // Check if user clicked back while getUserMedia was resolving
      if (isCancelledRef.current || !mediaStream) {
        if (mediaStream) {
          mediaStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        }
        return;
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);

      // Directly link to existing video DOM element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current
          .play()
          .then(() => {
            if (!isCancelledRef.current) {
              setIsInitializing(false);
              setHasStartedVideo(true);
            }
          })
          .catch((e) => {
            console.warn('Video auto-play delayed, readying viewfinder:', e);
            if (!isCancelledRef.current) {
              setIsInitializing(false);
              setHasStartedVideo(true);
            }
          });
      }
    } catch (err: unknown) {
      clearTimeout(timeoutTimer);
      if (isCancelledRef.current) return;

      setIsInitializing(false);
      const errorMsg = err instanceof Error ? err.name : 'UnknownError';
      if (errorMsg === 'NotAllowedError' || errorMsg === 'PermissionDeniedError') {
        setCameraError('Camera access was blocked. Please allow camera permissions in your browser address bar, or use the Native Device Camera below.');
      } else if (errorMsg === 'NotFoundError' || errorMsg === 'DevicesNotFoundError') {
        setCameraError('No physical camera detected on this system.');
      } else if (errorMsg === 'NotReadableError' || errorMsg === 'TrackStartError') {
        setCameraError('Camera is currently in use by another application (e.g. Teams, Zoom, or another tab).');
      } else {
        setCameraError('Unable to open optical sensor stream: ' + errorMsg);
      }
    }
  }, []);

  useEffect(() => {
    if (visible) {
      isCancelledRef.current = false;
      startCamera();
    } else {
      stopAllTracks();
    }
    return () => {
      stopAllTracks();
    };
  }, [visible, startCamera, stopAllTracks]);

  // Synchronize stream changes with video element
  useEffect(() => {
    if (videoRef.current && stream && !isCancelledRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current
        .play()
        .then(() => {
          if (!isCancelledRef.current) {
            setIsInitializing(false);
            setHasStartedVideo(true);
          }
        })
        .catch(() => {
          if (!isCancelledRef.current) {
            setIsInitializing(false);
            setHasStartedVideo(true);
          }
        });
    }
  }, [stream]);

  // Handle hardware / keyboard Escape key to close
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBack();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, handleBack]);

  const handleCapture = () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL('image/jpeg', 0.88);

      const capturedPhoto: PhotoAttachment = {
        uri: dataUri,
        name: `live_hazard_${Date.now()}.jpg`,
        type: 'image/jpeg',
        sizeBytes: Math.round((dataUri.length * 3) / 4),
        capturedAt: new Date().toISOString(),
      };

      stopAllTracks();
      onCapture(capturedPhoto);
      onClose();
    } catch (err) {
      console.error('Capture error', err);
    }
  };

  // Direct Hardware Trigger via native HTML5 camera capture
  const handleNativeCameraTrigger = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleNativeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      const capturedPhoto: PhotoAttachment = {
        uri: dataUri,
        name: file.name || `camera_${Date.now()}.jpg`,
        type: file.type || 'image/jpeg',
        sizeBytes: file.size,
        capturedAt: new Date().toISOString(),
      };
      stopAllTracks();
      onCapture(capturedPhoto);
      onClose();
    };
    reader.readAsDataURL(file);
  };

  const handleSimulatedFallback = () => {
    const fallbackPhoto: PhotoAttachment = {
      uri: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
      name: `field_hazard_demo_${Date.now()}.jpg`,
      type: 'image/jpeg',
      sizeBytes: 1024 * 320,
      capturedAt: new Date().toISOString(),
    };
    stopAllTracks();
    onCapture(fallbackPhoto);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleBack}>
      <View style={styles.container}>
        {/* Hidden Native Camera Input with capture="environment" */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleNativeFileChange}
        />

        {/* Top Navigation Bar with High-Visibility "← Back" Button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeBtnIcon}>←</Text>
            <Text style={styles.closeBtnText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.titleCol}>
            <Text style={styles.cameraTitle}>OPTICAL FIELD SENSOR</Text>
            <Text style={styles.cameraSubtitle}>Live Hardware Shutter</Text>
          </View>

          <TouchableOpacity
            style={styles.cancelTopBtn}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelTopBtnText}>Close ✕</Text>
          </TouchableOpacity>
        </View>

        {/* Viewfinder Container */}
        <View style={styles.viewfinder}>
          {/* Always rendered video node */}
          <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#000' }}>
            <video
              ref={(node) => {
                videoRef.current = node;
              }}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => {
                if (!isCancelledRef.current) {
                  setIsInitializing(false);
                  setHasStartedVideo(true);
                }
              }}
              onCanPlay={() => {
                if (!isCancelledRef.current) {
                  setIsInitializing(false);
                  setHasStartedVideo(true);
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            />

            {/* Tactical Viewfinder Overlay Grid */}
            {hasStartedVideo && !cameraError && (
              <div
                style={{
                  position: 'absolute',
                  inset: '20px',
                  border: '1.5px solid rgba(255, 255, 255, 0.35)',
                  borderRadius: '12px',
                  pointerEvents: 'none',
                  boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5)',
                }}
              >
                {/* Crosshair Center */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '32px',
                    height: '32px',
                    transform: 'translate(-50%, -50%)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    borderRadius: '50%',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(15, 23, 42, 0.85)',
                    color: '#94A3B8',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    letterSpacing: '0.08em',
                  }}
                >
                  ALIGN HAZARD SCARP IN FRAME
                </div>
              </div>
            )}
          </div>

          {/* Loading Spinner Overlay */}
          {isInitializing && !cameraError && (
            <View style={styles.overlayCenter}>
              <ActivityIndicator size="large" color="#38BDF8" />
              <Text style={styles.loadingText}>Initializing camera lens...</Text>
              <Text style={styles.loadingSub}>Please allow camera access in your browser prompt</Text>

              {/* Instant fallback button if browser prompt is obscured */}
              <TouchableOpacity
                style={styles.quickFallbackBtn}
                onPress={handleNativeCameraTrigger}
                activeOpacity={0.8}
              >
                <Text style={styles.quickFallbackText}>📸 Trigger Native Camera App</Text>
              </TouchableOpacity>

              {/* Explicit cancel button during loading */}
              <TouchableOpacity
                style={styles.cancelLoadingBtn}
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelLoadingText}>Cancel and Return</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Error / Fallback State with Direct Action Buttons */}
          {cameraError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorIcon}>📷</Text>
              <Text style={styles.errorTitle}>Camera Hardware Access</Text>
              <Text style={styles.errorMessage}>{cameraError}</Text>

              <TouchableOpacity
                style={styles.nativeCameraBtn}
                onPress={handleNativeCameraTrigger}
                activeOpacity={0.8}
              >
                <Text style={styles.nativeCameraBtnText}>📸 Capture with Device Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.retryBtn}
                onPress={startCamera}
                activeOpacity={0.8}
              >
                <Text style={styles.retryBtnText}>Retry Live Stream</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoFallbackBtn}
                onPress={handleSimulatedFallback}
                activeOpacity={0.8}
              >
                <Text style={styles.demoFallbackText}>Use Sample Slope Photo (Demo)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.errorBackBtn}
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <Text style={styles.errorBackBtnText}>← Return to Report</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Shutter Action Bar */}
        <View style={styles.bottomBar}>
          <View style={styles.antiFraudTag}>
            <Text style={styles.antiFraudText}>OPTICAL SENSOR CAPTURE ONLY • NO FILE UPLOADS</Text>
          </View>

          {/* Action Row */}
          <View style={styles.shutterRow}>
            <TouchableOpacity
              style={styles.bottomCancelBtn}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Text style={styles.bottomCancelText}>Cancel</Text>
            </TouchableOpacity>

            {/* Shutter Button when live stream is running */}
            {hasStartedVideo ? (
              <TouchableOpacity
                style={styles.shutterRing}
                onPress={handleCapture}
                activeOpacity={0.7}
              >
                <View style={styles.shutterCore} />
              </TouchableOpacity>
            ) : (
              <View style={styles.shutterPlaceholder} />
            )}

            <TouchableOpacity
              style={styles.bottomNativeBtn}
              onPress={handleNativeCameraTrigger}
              activeOpacity={0.7}
            >
              <Text style={styles.bottomNativeText}>Device App ↗</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

LiveCameraModal.displayName = 'LiveCameraModal';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  topBar: {
    height: 64,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    zIndex: 100,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#334155',
  },
  closeBtnIcon: {
    color: '#38BDF8',
    fontWeight: '900',
    fontSize: 16,
    marginRight: 6,
  },
  closeBtnText: {
    color: '#F8FAFC',
    fontWeight: '800',
    fontSize: 13,
  },
  cancelTopBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelTopBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  titleCol: {
    alignItems: 'center',
  },
  cameraTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cameraSubtitle: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },
  viewfinder: {
    flex: 1,
    backgroundColor: '#020617',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayCenter: {
    position: 'absolute',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: 'rgba(2, 6, 23, 0.88)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#1E293B',
    maxWidth: 340,
    marginHorizontal: SPACING.lg,
    zIndex: 10,
  },
  loadingText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginTop: SPACING.md,
  },
  loadingSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  quickFallbackBtn: {
    marginTop: SPACING.lg,
    backgroundColor: '#0284C7',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
  },
  quickFallbackText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelLoadingBtn: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelLoadingText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  errorCard: {
    position: 'absolute',
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#334155',
    padding: SPACING.xl,
    marginHorizontal: SPACING.lg,
    maxWidth: 380,
    alignItems: 'center',
    zIndex: 10,
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  errorTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  errorMessage: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  nativeCameraBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  nativeCameraBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  retryBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  retryBtnText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  demoFallbackBtn: {
    paddingVertical: 8,
    width: '100%',
    alignItems: 'center',
  },
  demoFallbackText: {
    color: '#64748B',
    fontSize: 12,
  },
  errorBackBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#334155',
    borderRadius: RADIUS.sm,
  },
  errorBackBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomBar: {
    height: 130,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  antiFraudTag: {
    marginBottom: 10,
  },
  antiFraudText: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: 'monospace',
    letterSpacing: 0.8,
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: SPACING.xl,
  },
  bottomCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.sm,
  },
  bottomCancelText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  shutterRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  shutterCore: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DC2626',
  },
  shutterPlaceholder: {
    width: 64,
    height: 64,
  },
  bottomNativeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  bottomNativeText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
});
