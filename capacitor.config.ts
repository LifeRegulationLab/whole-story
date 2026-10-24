import type { CapacitorConfig } from '@capacitor/cli';

// The phone shell: the same Vite build, copied into ios/ by `npm run build:shell`.
const config: CapacitorConfig = {
  appId: 'com.liferegulationlab.wholestory',
  appName: 'Whole Story',
  webDir: 'dist',
  backgroundColor: '#f4f1ea',
  plugins: {
    // Apple and Google sign-in use the phone's own sheets; the result is handed to the Firebase web SDK.
    FirebaseAuthentication: { skipNativeAuth: true, providers: ['apple.com', 'google.com'] },
  },
  experimental: {
    ios: { spm: { swiftToolsVersion: '6.1', packageTraits: { '@capacitor-firebase/authentication': ['Google'] } } },
  },
};

export default config;
