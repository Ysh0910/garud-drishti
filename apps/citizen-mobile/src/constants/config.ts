/**
 * Runtime configuration for GARUD DRISHTI Citizen Mobile
 */

export const APP_CONFIG = {
  appName: 'GARUD DRISHTI',
  version: '1.0.0-sih',
  tagline: 'See the Risk. Act Before the Disaster.',
  
  // Backend API URL:
  // Dynamically uses localhost:8000 when running in browser or configured host
  apiBaseUrl: (typeof window !== 'undefined' && window.location?.hostname === 'localhost')
    ? 'http://localhost:8000'
    : (process.env.REACT_APP_API_URL || 'http://localhost:8000'),

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
