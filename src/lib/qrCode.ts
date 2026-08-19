import QRCode from 'qrcode';

/**
 * Generates an ISO-compliant, pixel-perfect vector SVG string for the QR Code (100% offline)
 */
export const generateQRCodeSVG = async (text: string): Promise<string> => {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
};

/**
 * Generates a clean data URL (PNG format)
 */
export const generateQRCodeDataURL = async (text: string): Promise<string> => {
  return QRCode.toDataURL(text, {
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
};
