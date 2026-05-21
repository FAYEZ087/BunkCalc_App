import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics } from '@capacitor/haptics';

/**
 * Gracefully checks and requests notification permission using the Capacitor LocalNotifications plugin.
 * Safe to call on web and across different native platforms.
 * 
 * @returns Promise<boolean> True if permission is granted, false otherwise.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (!LocalNotifications) {
      console.warn('LocalNotifications plugin is not loaded/available.');
      return false;
    }

    const check = await LocalNotifications.checkPermissions();
    if (check.display === 'granted') {
      return true;
    }

    const request = await LocalNotifications.requestPermissions();
    return request.display === 'granted';
  } catch (error) {
    console.warn('Failed to ensure notification permission: ', error);
    // Graceful fallback for non-supported browsers or environments
    if (typeof Notification !== 'undefined') {
      try {
        if (Notification.permission === 'granted') {
          return true;
        }
        const webPermission = await Notification.requestPermission();
        return webPermission === 'granted';
      } catch (webErr) {
        console.warn('Web notification API permission request failed:', webErr);
      }
    }
    return false;
  }
}

/**
 * Gracefully checks haptic availability or status.
 * Haptics in Capacitor generally do not have an explicit runtime permission dialog,
 * but this wrapper ensures no exceptions are thrown on unsupported web/OS runtimes.
 * 
 * @returns Promise<boolean> True if haptics are safely supported/ready, false otherwise.
 */
export async function ensureHapticPermission(): Promise<boolean> {
  try {
    if (!Haptics) {
      console.warn('Haptics plugin is not loaded/available.');
      return false;
    }
    
    // Check if we are running in web environment where navigator.vibrate is available
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      return true;
    }
    
    // For standard native shells, returning true is safe as Haptics doesn't demand native permission dialogs.
    return true;
  } catch (error) {
    console.warn('Failed to verify haptic capabilities/permissions:', error);
    return false;
  }
}
