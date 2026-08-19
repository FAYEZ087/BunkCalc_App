import type { Subject, ScheduleSlot } from './types';
import { v4 as uuidv4 } from 'uuid';
import { generateQRCodeSVG } from './qrCode';

const BK_PREFIX = 'BK:';
const LEGACY_PREFIX = 'BUNKTT:';

/**
 * Encodes subjects into an ultra-compact string payload
 */
export const encodeCompactPayload = (subjects: Subject[], sectionName?: string): string => {
  const cleanSection = (sectionName || 'Class Timetable').replace(/[~|:]/g, ' ').trim();
  
  const encodedSubjects = subjects.map(s => {
    const cleanName = s.name.replace(/[~|:]/g, ' ').trim();
    const credits = s.credits || 3;
    const thresholdPct = Math.round((s.threshold || 0.75) * 100);
    const isLab = s.isLab ? 1 : 0;
    const color = (s as any).color || '#3b82f6';
    const slots = (s.schedule || []).map(sc => `${sc.day}@${sc.slot}`).join(',');
    return `${cleanName}|${credits}|${thresholdPct}|${isLab}|${color}|${slots}`;
  });

  return `${cleanSection}~${encodedSubjects.join('~')}`;
};

/**
 * Generates an ultra-short (6 to 10 letter) share code via CORS-compliant cloud storage
 */
export const createShortCloudCode = async (subjects: Subject[], sectionName?: string): Promise<string> => {
  const payload = encodeCompactPayload(subjects, sectionName);

  // 1. Try RESTful Object KV API (100% CORS-friendly, instant)
  try {
    const response = await fetch('https://api.restful-api.dev/objects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        name: `BUNK_${(sectionName || 'TT').slice(0, 10)}`,
        data: { p: payload },
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result && result.id) {
        // Result ID is like "ff808181932...", take first 8 chars or full
        const slug = String(result.id).trim();
        return `BK-${slug}`;
      }
    }
  } catch (err) {
    console.warn('REST API shortener failed, trying dpaste fallback...', err);
  }

  // 2. Try dpaste.org (generates 4-6 char slug)
  try {
    const response = await fetch('https://dpaste.org/api/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        content: payload,
        format: 'json',
        expiry_days: '90',
        title: sectionName || 'BunkCalc Timetable',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.url) {
        const slug = data.url.split('/').filter(Boolean).pop();
        if (slug) return `BK-${slug}`;
      }
    }
  } catch (err) {
    console.warn('dpaste fallback failed:', err);
  }

  // 3. Fallback: Compact delimited code (guaranteed 100% offline)
  return `BK:${payload}`;
};

export const APP_BASE_URL = 'https://bunk-calc-web.vercel.app/';

/**
 * Builds the standard Web URL to encode into the QR code so any phone camera opens it immediately
 */
export const buildTimetableQRWebUrl = (codeOrPayload: string): string => {
  const clean = codeOrPayload.trim();
  return `${APP_BASE_URL}?import=${encodeURIComponent(clean)}`;
};

/**
 * Decodes timetable data from either:
 * - A Web URL (e.g. "https://bunk-calc-web.vercel.app/?import=BK-A8F3")
 * - A short code (e.g. "BK-ff808181...", "BK-A8F3", "A8F3")
 * - A full compact string ("BK:...")
 * - A legacy base64 string ("BUNKTT:...")
 */
export const decodeTimetable = async (input: string): Promise<{ sectionName: string; subjects: Subject[] }> => {
  let raw = input.trim();

  // If user scanned or pasted a full Web URL with ?import=
  if (raw.includes('?import=') || raw.includes('&import=')) {
    try {
      const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
      const param = url.searchParams.get('import');
      if (param) raw = decodeURIComponent(param);
    } catch {
      const match = raw.match(/[?&]import=([^&]+)/);
      if (match) raw = decodeURIComponent(match[1]);
    }
  }

  // If user entered a short code like "BK-..." or alphanumeric code without "|"
  if (!raw.includes('|') && !raw.includes('~')) {
    let cleanCode = raw;
    if (cleanCode.startsWith('BK-')) {
      cleanCode = cleanCode.slice(3).trim();
    } else if (cleanCode.startsWith('BK:')) {
      cleanCode = cleanCode.slice(3).trim();
    }

    // 1. Try resolving via RESTful Object API
    try {
      const response = await fetch(`https://api.restful-api.dev/objects/${cleanCode}`);
      if (response.ok) {
        const obj = await response.json();
        if (obj && obj.data && obj.data.p && obj.data.p.includes('|')) {
          raw = obj.data.p;
        }
      }
    } catch {
      // continue
    }

    // 2. Try resolving via dpaste.org
    if (!raw.includes('|')) {
      try {
        const response = await fetch(`https://dpaste.org/${cleanCode}/raw`);
        if (response.ok) {
          const text = await response.text();
          if (text && text.includes('|')) {
            raw = text;
          }
        }
      } catch {
        // continue
      }
    }
  }

  // 1. Compact format (SectionName~Subject1|... or BK:...)
  if (raw.startsWith(BK_PREFIX) || raw.includes('|')) {
    const clean = raw.startsWith(BK_PREFIX) ? raw.slice(BK_PREFIX.length) : raw;
    const parts = clean.split('~');
    
    let sectionName = 'Imported Timetable';
    let subjectChunks = parts;

    // If first part has no '|', it's the section name
    if (parts.length > 1 && !parts[0].includes('|')) {
      sectionName = parts[0].trim() || 'Imported Timetable';
      subjectChunks = parts.slice(1);
    }

    const subjects: Subject[] = subjectChunks
      .filter(chunk => chunk.trim().length > 0 && chunk.includes('|'))
      .map(chunk => {
        const [name, creditsStr, thresholdStr, isLabStr, color, slotsStr] = chunk.split('|');
        if (!name) throw new Error('Invalid subject in timetable code');

        const schedule: ScheduleSlot[] = (slotsStr || '')
          .split(',')
          .filter(Boolean)
          .map(slotToken => {
            const [dayStr, timeStr] = slotToken.split('@');
            return {
              day: Number(dayStr) || 1,
              slot: timeStr || '09:00',
            };
          });

        const thresholdNum = Number(thresholdStr);
        const threshold = thresholdNum > 1 ? thresholdNum / 100 : (thresholdNum || 0.75);

        return {
          id: uuidv4(),
          name: name.trim(),
          credits: Number(creditsStr) || 3,
          threshold,
          isLab: isLabStr === '1',
          color: color || '#3b82f6',
          schedule,
          attendedSoFar: 0,
          missedSoFar: 0,
        };
      });

    if (subjects.length === 0) {
      throw new Error('No valid subjects found in this code.');
    }

    return { sectionName, subjects };
  }

  // 2. Legacy Base64 JSON fallback
  if (raw.startsWith(LEGACY_PREFIX)) {
    try {
      const base64 = raw.slice(LEGACY_PREFIX.length);
      const jsonStr = decodeURIComponent(atob(base64));
      const data = JSON.parse(jsonStr);
      const subjects: Subject[] = (data.subjects || []).map((s: any) => ({
        id: uuidv4(),
        name: String(s.name).trim(),
        code: s.code?.trim() || '',
        credits: Number(s.credits) || 3,
        threshold: Number(s.threshold) || 0.75,
        isLab: !!s.isLab,
        color: s.color || '#3b82f6',
        schedule: (s.schedule || []).map((sc: any) => ({
          day: Number(sc.day),
          slot: sc.slot,
        })),
        attendedSoFar: 0,
        missedSoFar: 0,
      }));
      return { sectionName: data.sectionName || 'Imported Timetable', subjects };
    } catch {
      throw new Error('Invalid timetable format.');
    }
  }

  throw new Error('Could not find timetable data for this code. Please check and try again.');
};

/**
 * Generates an offline inline SVG QR code
 */
export const generateTimetableQRSvg = async (text: string): Promise<string> => {
  return generateQRCodeSVG(text);
};

/**
 * Builds an aesthetic, ready-to-share message for WhatsApp, Telegram, etc.
 */
export const buildShareMessage = (
  sectionName: string,
  shortCode: string,
  appUrl = 'https://bunk-calc-web.vercel.app/'
): string => {
  const cleanSection = sectionName?.trim() || 'Class Schedule';
  return (
    `*BunkCalc — Class Timetable*\n` +
    `Section: ${cleanSection}\n\n` +
    `I've set up our official weekly timetable in BunkCalc with all class and lab timings pre-configured.\n\n` +
    `Timetable Code: \`${shortCode}\`\n\n` +
    `How to import:\n` +
    `1. Open: ${appUrl}\n` +
    `2. Go to Settings -> Import Timetable (or scan the attached QR code)\n` +
    `3. Enter code: \`${shortCode}\`\n\n` +
    `Track your attendance and safe bunk buffer accurately.`
  );
};

/**
 * Renders a high-res branded QR share card image (PNG Blob) with just the QR code
 */
export const generateTimetableCardBlob = (
  svgString: string,
  sectionName: string
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const width = 640;
        const height = 680;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        // Draw dark card background
        ctx.fillStyle = '#0f172a'; // slate-900
        ctx.fillRect(0, 0, width, height);

        // Gradient top banner
        const grad = ctx.createLinearGradient(0, 0, width, 110);
        grad.addColorStop(0, '#2563eb'); // blue-600
        grad.addColorStop(1, '#7c3aed'); // violet-600
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, 110);

        // Header Title
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 26px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BunkCalc Timetable', width / 2, 48);

        ctx.font = '600 15px system-ui, sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(sectionName || 'Class Schedule', width / 2, 82);

        // White QR Box (Centered)
        const qrBoxSize = 440;
        const qrBoxX = (width - qrBoxSize) / 2;
        const qrBoxY = 140;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28);
        ctx.fill();

        // Draw QR Code inside box with padding
        ctx.drawImage(img, qrBoxX + 20, qrBoxY + 20, qrBoxSize - 40, qrBoxSize - 40);

        // Footer Text
        ctx.fillStyle = '#64748b'; // slate-500
        ctx.font = '600 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Scan with BunkCalc • bunk-calc-web.vercel.app', width / 2, 630);

        URL.revokeObjectURL(blobUrl);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to generate image blob'));
        }, 'image/png');
      };

      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error('Failed to load QR SVG into image'));
      };

      img.src = blobUrl;
    } catch (err) {
      reject(err);
    }
  });
};

