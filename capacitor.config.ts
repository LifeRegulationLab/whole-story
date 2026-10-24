import type { CapacitorConfig } from '@capacitor/cli';

// The phone shell: the same Vite build, copied into ios/ by `npm run build:shell`.
const config: CapacitorConfig = {
  appId: 'com.liferegulationlab.wholestory',
  appName: 'Whole Story',
  webDir: 'dist',
  backgroundColor: '#f4f1ea',
};

export default config;
