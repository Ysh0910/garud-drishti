/**
 * Runtime configuration for GARUD DRISHTI Citizen Mobile
 */

export const APP_CONFIG = {
  appName: 'GARUD DRISHTI',
  version: '1.0.0-sih',
  tagline: 'See the Risk. Act Before the Disaster.',
  
  // Backend API URL:
  // Use http://10.0.2.2:8000 for Android Emulator connecting to host machine
  // Use http://localhost:8000 for web or iOS simulator
  // Dynamically uses localhost:8000 when running in browser or configured host
  apiBaseUrl: (typeof window !== 'undefined' && window.location?.hostname === 'localhost')
    ? 'http://localhost:8000'
    : ((typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || 'http://localhost:8000'),

  // Mock mode toggle: false enables live HTTP connection to backend API
  // Connects directly to FastAPI backend with graceful local queue fallback
  useMockTransport: false,

  // Fallback demo coordinates in North Eastern Region (Meghalaya / Sikkim)
  defaultLocation: {
    latitude: 25.6185,
    longitude: 91.8792,
    accuracy_m: 6.8,
    name: 'Mawkdok Dympep Valley, Meghalaya',
  },

  // Network sync settings
  syncRetryDelayMs: 5000,
  maxRetryAttempts: 5,
};
