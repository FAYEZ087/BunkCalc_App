import { create } from 'zustand';
import { APP_VERSION_CODE, VERSION_JSON_URL } from '../lib/constants';

interface VersionInfo {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  changelog?: string;
}

interface UpdateState {
  isUpdateAvailable: boolean;
  latestVersion: string;
  apkUrl: string;
  checkForUpdates: () => Promise<void>;
}

export const useUpdateStore = create<UpdateState>((set) => ({
  isUpdateAvailable: false,
  latestVersion: '',
  apkUrl: '',

  checkForUpdates: async () => {
    try {
      const response = await fetch(`${VERSION_JSON_URL}?t=${Date.now()}`);
      if (!response.ok) return;

      const data: VersionInfo = await response.json();

      if (typeof data.versionCode === 'number' && data.versionCode > APP_VERSION_CODE) {
        // Wait 3 seconds before displaying the banner to prevent flashing on fast loads
        await new Promise((resolve) => setTimeout(resolve, 3000));

        set({
          isUpdateAvailable: true,
          latestVersion: data.versionName || '2.0.0',
          apkUrl: data.apkUrl || 'https://bunk-calc-web.vercel.app/bunkcalc.apk',
        });
      }
    } catch {
      // Fire-and-forget: do nothing if network or parsing fails
    }
  },
}));
