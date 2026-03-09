import { lingui } from '@lingui/vite-plugin';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['@lingui/babel-plugin-lingui-macro'],
      },
    }),
    lingui(),
  ],
  publicDir: 'public',
  envPrefix: ['VITE_', 'REACT_APP_'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
