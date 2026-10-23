import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.soundpulse.music',
  appName: 'SoundPulse',
  webDir: 'public',
  server: {
    url: 'https://soundpulse-three.vercel.app',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    backgroundColor: '#08090d',
  },
};

export default config;
