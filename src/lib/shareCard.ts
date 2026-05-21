import html2canvas from 'html2canvas';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const shareAttendanceCard = async (): Promise<{ success: boolean; method?: 'native' | 'web-share' | 'download'; error?: string }> => {
  const element = document.getElementById('share-card');
  if (!element) {
    console.error('Share card element not found');
    return { success: false, error: 'Share card element not found' };
  }

  let tempContainer: HTMLDivElement | null = null;

  try {
    // Create a temporary container to render the card inside the active viewport.
    // Fixed positioning, low opacity (0.01), z-index, and pointerEvents: none ensure
    // that the card is laid out and painted by the WebView without being visible to the user.
    tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.top = '0';
    tempContainer.style.left = '0';
    tempContainer.style.width = '375px';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.opacity = '0.01';
    tempContainer.style.pointerEvents = 'none';

    // Clone the element and reset its negative absolute positioning styles
    const cloned = element.cloneNode(true) as HTMLElement;
    cloned.style.position = 'relative';
    cloned.style.left = '0';
    cloned.style.top = '0';

    tempContainer.appendChild(cloned);
    document.body.appendChild(tempContainer);

    const canvas = await html2canvas(cloned, {
      backgroundColor: '#020617', // slate-950
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const fileName = `BunkCalc_Report_${Date.now()}.png`;

    // 1. Try Native Capacitor Sharing if on native platform
    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = dataUrl.split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        await Share.share({
          title: 'BunkCalc Attendance Report',
          text: 'Check out my attendance stats!',
          files: [savedFile.uri],
          dialogTitle: 'Share Attendance Card',
        });
        return { success: true, method: 'native' };
      } catch (nativeError) {
        console.warn('Native Capacitor share failed, trying Web fallbacks:', nativeError);
      }
    }

    // 2. Try Web Share API (if supported by browser/platform, e.g. mobile Safari/Chrome)
    if (navigator.share) {
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'BunkCalc Attendance Report',
            text: 'Check out my attendance stats!',
            files: [file],
          });
          return { success: true, method: 'web-share' };
        }
      } catch (webShareError) {
        console.warn('Web Share API failed, falling back to download:', webShareError);
      }
    }

    // 3. Fallback: Standard Browser file download
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { success: true, method: 'download' };
  } catch (error: any) {
    console.error('Detailed sharing error:', error);
    return { success: false, error: error.message || 'Failed to generate share card.' };
  } finally {
    if (tempContainer && tempContainer.parentNode) {
      tempContainer.parentNode.removeChild(tempContainer);
    }
  }
};
