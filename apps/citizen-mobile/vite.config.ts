import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const extensions = [
  '.web.tsx',
  '.web.ts',
  '.web.jsx',
  '.web.js',
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.json',
];

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
    __DEV__: JSON.stringify(true),
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'react-native-maps': 'react-native-web',
      'react-native-screens': path.resolve(import.meta.dirname, 'src/utils/webShims/screensMock.tsx'),
      'react-native-safe-area-context': path.resolve(import.meta.dirname, 'src/utils/webShims/safeAreaMock.tsx'),
    },
    extensions,
  },
  server: {
    port: 3001,
    open: false,
  },
});



