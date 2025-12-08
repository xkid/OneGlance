import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use '.' as root to avoid "Property 'cwd' does not exist on type 'Process'" error
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // This is necessary because the app code relies on process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});