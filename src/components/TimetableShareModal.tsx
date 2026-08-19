import React, { useState, useMemo, useEffect } from 'react';
import { useSubjects } from '../store/useSubjects';
import { 
  createShortCloudCode, 
  decodeTimetable, 
  generateTimetableQRSvg, 
  encodeCompactPayload,
  buildShareMessage,
  generateTimetableCardBlob,
  buildTimetableQRWebUrl
} from '../lib/timetableShare';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import type { Subject } from '../lib/types';

interface TimetableShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'export' | 'import';
  initialImportCode?: string;
}

export const TimetableShareModal: React.FC<TimetableShareModalProps> = ({ 
  isOpen, 
  onClose,
  initialTab = 'export',
  initialImportCode = ''
}) => {
  const { subjects, addSubject } = useSubjects();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab);
  const [sectionName, setSectionName] = useState('My Section Timetable');
  const [shortCode, setShortCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [importCode, setImportCode] = useState(initialImportCode);
  const [isResolving, setIsResolving] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sync initial tab and code when opened
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (initialImportCode) setImportCode(initialImportCode);
    }
  }, [isOpen, initialTab, initialImportCode]);

  // Generate 6-8 character short code when subjects or section name changes
  useEffect(() => {
    if (!isOpen || subjects.length === 0) return;
    let isCancelled = false;

    const generateCode = async () => {
      setIsGenerating(true);
      try {
        const code = await createShortCloudCode(subjects, sectionName);
        if (!isCancelled) {
          setShortCode(code);
        }
      } catch (err) {
        console.warn('Failed to generate cloud short code:', err);
      } finally {
        if (!isCancelled) setIsGenerating(false);
      }
    };

    generateCode();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, subjects, sectionName]);

  // Compact offline payload fallback
  const compactPayload = useMemo(() => {
    if (subjects.length === 0) return '';
    return `BK:${encodeCompactPayload(subjects, sectionName)}`;
  }, [subjects, sectionName]);

  const displayCode = shortCode || compactPayload;

  // Web URL QR payload (encodes standard https:// URL so any phone camera/lens opens BunkCalc directly!)
  const qrWebUrl = useMemo(() => {
    if (subjects.length === 0) return '';
    return buildTimetableQRWebUrl(displayCode);
  }, [subjects, displayCode]);

  // 100% Offline Inline SVG QR
  const [qrSvg, setQrSvg] = useState<string>('');

  useEffect(() => {
    if (!qrWebUrl) {
      setQrSvg('');
      return;
    }
    let isCancelled = false;
    generateTimetableQRSvg(qrWebUrl)
      .then((svg) => {
        if (!isCancelled) setQrSvg(svg);
      })
      .catch((err) => {
        console.warn('QR Generation error:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [qrWebUrl]);

  // Preview decoded subjects on import
  const [previewData, setPreviewData] = useState<{ sectionName: string; subjects: Subject[] } | null>(null);
  const [importedSubjects, setImportedSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (!importCode.trim() || importCode.trim().length < 4) {
      setPreviewData(null);
      setImportedSubjects([]);
      return;
    }
    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        const decoded = await decodeTimetable(importCode);
        if (!isCancelled) {
          setPreviewData(decoded);
          setImportedSubjects(decoded.subjects);
        }
      } catch {
        if (!isCancelled) {
          setPreviewData(null);
          setImportedSubjects([]);
        }
      }
    }, 400);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [importCode]);

  if (!isOpen) return null;

  const handleCopyMessage = async () => {
    const message = buildShareMessage(sectionName, displayCode);
    try {
      await navigator.clipboard.writeText(message);
      setCopySuccess(true);
      setSuccessMessage('Invite message copied with website link & code!');
      setTimeout(() => {
        setCopySuccess(false);
        setSuccessMessage('');
      }, 2500);
    } catch {
      setErrorMessage('Failed to copy to clipboard');
    }
  };

  const handleDownloadQRImage = async () => {
    if (!qrSvg) return;
    setIsDownloading(true);
    try {
      const blob = await generateTimetableCardBlob(qrSvg, sectionName);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BunkCalc-${(sectionName || 'Timetable').replace(/\s+/g, '_')}-QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccessMessage('QR Card downloaded successfully!');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      console.warn('Failed to download QR image:', err);
      setErrorMessage('Could not download QR image');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareWithQR = async () => {
    const message = buildShareMessage(sectionName, displayCode);
    setIsSharingImage(true);

    try {
      // 1. Generate PNG Card Blob
      let cardFile: File | null = null;
      if (qrSvg) {
        try {
          const blob = await generateTimetableCardBlob(qrSvg, sectionName);
          cardFile = new File([blob], `${(sectionName || 'Timetable').replace(/\s+/g, '_')}-QR.png`, {
            type: 'image/png',
          });
        } catch (err) {
          console.warn('Could not generate card blob:', err);
        }
      }

      // 2. Try Web Share API with File attachment
      if (navigator.share && cardFile && navigator.canShare && navigator.canShare({ files: [cardFile] })) {
        try {
          await navigator.share({
            title: `BunkCalc - ${sectionName || 'Class Timetable'}`,
            text: message,
            files: [cardFile],
          });
          setIsSharingImage(false);
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setIsSharingImage(false);
            return;
          }
        }
      }

      // 3. Try Native Capacitor Share
      if (Capacitor.isNativePlatform()) {
        try {
          await Share.share({
            title: `BunkCalc - ${sectionName || 'Class Timetable'}`,
            text: message,
            dialogTitle: 'Share Class Timetable & QR Code',
          });
          setIsSharingImage(false);
          return;
        } catch (err) {
          console.warn('Native share canceled or failed', err);
        }
      }

      // 4. Try standard Web Share text
      if (navigator.share) {
        try {
          await navigator.share({
            title: `BunkCalc - ${sectionName || 'Class Timetable'}`,
            text: message,
          });
          setIsSharingImage(false);
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setIsSharingImage(false);
            return;
          }
        }
      }

      // 5. Fallback: Copy beautiful message to clipboard
      await handleCopyMessage();
    } catch (err) {
      console.warn('Share error:', err);
      handleCopyMessage();
    } finally {
      setIsSharingImage(false);
    }
  };

  const handleApplyImport = async () => {
    setErrorMessage('');
    const subjectsToImport = importedSubjects.length > 0 ? importedSubjects : previewData?.subjects;

    if (!subjectsToImport || subjectsToImport.length === 0) {
      setErrorMessage('Please enter a timetable short code (e.g. BK-A8F3) to import.');
      return;
    }

    setIsResolving(true);
    try {
      // Add each subject with its customized past attendance
      for (const sub of subjectsToImport) {
        addSubject({
          ...sub,
          attendedSoFar: Math.max(0, Number(sub.attendedSoFar) || 0),
          missedSoFar: Math.max(0, Number(sub.missedSoFar) || 0),
        });
      }

      setSuccessMessage(`Successfully imported ${subjectsToImport.length} subjects with past attendance!`);
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save timetable.');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Class Timetable Share</span>
            </h2>
            <p className="text-xs text-slate-500">Share or import class section schedules in 1 click</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="p-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex gap-2">
          <button
            onClick={() => { setActiveTab('export'); setErrorMessage(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'export'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Share Timetable</span>
          </button>
          <button
            onClick={() => { setActiveTab('import'); setErrorMessage(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'import'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import Timetable</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              {successMessage}
            </div>
          )}

          {activeTab === 'export' ? (
            subjects.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No subjects configured yet. Add subjects first to share your timetable.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Section / Batch Name
                  </label>
                  <input
                    type="text"
                    value={sectionName}
                    onChange={(e) => setSectionName(e.target.value)}
                    placeholder="e.g. CSE Section A"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-medium outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Offline Pure SVG QR Code */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {qrSvg ? (
                    <div 
                      className="w-52 h-52 rounded-2xl bg-white p-2.5 shadow-md flex items-center justify-center overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                  ) : (
                    <div className="w-52 h-52 rounded-2xl bg-white p-4 shadow-sm flex items-center justify-center text-xs text-slate-400">
                      Generating QR...
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-2.5 font-medium text-center">
                    Classmates can scan this QR or copy the short code below
                  </p>
                </div>

                {/* Short Code Display with Overflow Protection */}
                <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/30 p-3.5 rounded-2xl text-center shadow-sm w-full max-w-full overflow-hidden">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 block mb-1">
                    ⚡ Timetable Share Code
                  </span>
                  <div className="w-full max-w-full overflow-hidden flex items-center justify-center">
                    {isGenerating ? (
                      <span className="text-xs font-normal italic text-slate-400 animate-pulse py-1">
                        Generating code...
                      </span>
                    ) : (
                      <div className={`w-full font-mono font-bold break-all select-all ${
                        (shortCode || '').length <= 12
                          ? 'text-lg md:text-xl font-black tracking-wider text-blue-600 dark:text-blue-300 py-0.5'
                          : (shortCode || '').length <= 25
                          ? 'text-xs md:text-sm font-bold tracking-normal text-blue-600 dark:text-blue-300 py-1'
                          : 'text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg max-h-16 overflow-y-auto text-left leading-relaxed'
                      }`}>
                        {shortCode || 'BK-CODE'}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Share this code with classmates on WhatsApp or SMS
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleShareWithQR}
                    disabled={isSharingImage}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 active:scale-95 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
                  >
                    {isSharingImage ? (
                      <>
                        <span className="animate-spin text-sm">↻</span>
                        <span>Preparing QR & Message...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        <span>Share Invite & QR Card</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDownloadQRImage}
                      disabled={isDownloading}
                      className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
                    >
                      {isDownloading ? (
                        <span>Saving...</span>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>Save QR Card</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleCopyMessage}
                      className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
                    >
                      {copySuccess ? (
                        <span className="text-emerald-500">Copied!</span>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          <span>Copy Message</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Enter Timetable Code
                  </label>
                  <label className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Scan QR Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          if ('BarcodeDetector' in window) {
                            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                            const bitmap = await createImageBitmap(file);
                            const barcodes = await detector.detect(bitmap);
                            if (barcodes.length > 0 && barcodes[0].rawValue) {
                              setImportCode(barcodes[0].rawValue);
                              setSuccessMessage('QR Code detected!');
                              setTimeout(() => setSuccessMessage(''), 2000);
                              return;
                            }
                          }
                        } catch (err) {
                          console.warn('Barcode detector error:', err);
                        }
                        setErrorMessage('Could not auto-read QR from this image. Please enter the 6-letter code manually.');
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={importCode}
                  onChange={(e) => setImportCode(e.target.value)}
                  placeholder="e.g. BK-A8F3, short code, or URL"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl text-base font-mono font-bold tracking-wider outline-none focus:border-blue-500 text-slate-900 dark:text-white text-center"
                />
                <p className="text-[10px] text-slate-400 mt-1 text-center">
                  Enter 6-letter short code, scan QR, or paste link
                </p>
              </div>

              {/* Live Preview & Past Attendance Adjustment */}
              {previewData && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/25 p-3 rounded-xl">
                    <div className="flex justify-between items-center text-xs font-black text-blue-600 dark:text-blue-400 mb-1">
                      <span>Section: {previewData.sectionName}</span>
                      <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded-full font-bold">
                        {importedSubjects.length} Subjects
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                      Downloaded mid-semester? Enter any classes attended or missed before using the app (leave 0 if fresh):
                    </p>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                    {importedSubjects.map((sub, idx) => (
                      <div 
                        key={sub.id || idx} 
                        className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 p-3 rounded-xl space-y-2 shadow-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {sub.name} {sub.isLab ? '(Lab)' : ''}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            {sub.credits} cr • {sub.schedule.length} slots/wk
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/70 rounded-lg p-1.5 focus-within:border-emerald-500">
                            <label className="block text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                              Attended So Far
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={sub.attendedSoFar || ''}
                              placeholder="0"
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setImportedSubjects(prev => prev.map((s, i) => i === idx ? { ...s, attendedSoFar: val } : s));
                              }}
                              className="w-full bg-transparent text-xs font-black text-slate-900 dark:text-white outline-none"
                            />
                          </div>

                          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/70 rounded-lg p-1.5 focus-within:border-red-500">
                            <label className="block text-[8px] font-black uppercase text-red-600 dark:text-red-400">
                              Missed / Bunked
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={sub.missedSoFar || ''}
                              placeholder="0"
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setImportedSubjects(prev => prev.map((s, i) => i === idx ? { ...s, missedSoFar: val } : s));
                              }}
                              className="w-full bg-transparent text-xs font-black text-slate-900 dark:text-white outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleApplyImport}
                disabled={!importCode.trim() || isResolving}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 active:scale-95 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isResolving ? (
                  'Fetching Timetable...'
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Import {importedSubjects.length > 0 ? `${importedSubjects.length} Subjects` : 'Timetable'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
