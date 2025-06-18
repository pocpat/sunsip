import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  define: {
    'import.meta.env.VITE_GEOCODING_API_KEY': JSON.stringify('test-api-key'),
    'import.meta.env.VITE_OPENWEATHER_API_KEY': JSON.stringify('test-weather-key'),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://test.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('test-anon-key'),
    'import.meta.env.VITE_OPENROUTER_API_KEY': JSON.stringify('test-openrouter-key'),
    'import.meta.env.VITE_OPENROUTER_TEXT_MODEL': JSON.stringify('mistralai/mistral-7b-instruct'),
    'import.meta.env.VITE_IMAGEROUTER_API_KEY': JSON.stringify('test-imagerouter-key'),
    'import.meta.env.VITE_PORTFOLIO_MODE_ENABLED': JSON.stringify('true'),
  },
});