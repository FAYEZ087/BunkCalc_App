import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * SplashScreen: Full-screen launch sequence.
 *
 * Flow:
 *   1. Logo fades in (600 ms) → holds (1 s) → fades out (600 ms)
 *   2. Video plays (≤ 10 s, skippable on tap)
 *   3. Fade to black (300 ms)
 *   4. Calls onComplete – parent detects theme & fades in home
 */

type Phase = 'logo-in' | 'logo-hold' | 'logo-out' | 'video' | 'fade-out' | 'done';

interface Props {
  onComplete: () => void;
}

const SplashScreen: React.FC<Props> = ({ onComplete }) => {
  const [phase, setPhase] = useState<Phase>('logo-in');
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Move to next phase after a delay
  const after = useCallback((ms: number, next: Phase) => {
    timerRef.current = setTimeout(() => setPhase(next), ms);
  }, []);

  // Phase machine
  useEffect(() => {
    switch (phase) {
      case 'logo-in':
        after(600, 'logo-hold');      // fade-in duration
        break;
      case 'logo-hold':
        after(1000, 'logo-out');      // hold visible
        break;
      case 'logo-out':
        after(600, 'video');          // fade-out duration
        break;
      case 'video':
        // video starts via autoplay + onCanPlay
        break;
      case 'fade-out':
        after(300, 'done');
        break;
      case 'done':
        onComplete();
        break;
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, after, onComplete]);

  // Auto-skip video after 10 s
  useEffect(() => {
    if (phase !== 'video') return;
    const id = setTimeout(() => setPhase('fade-out'), 10_000);
    return () => clearTimeout(id);
  }, [phase]);

  // Skip video on tap
  const handleSkip = () => {
    if (phase === 'video') {
      if (videoRef.current) videoRef.current.pause();
      setPhase('fade-out');
    }
  };

  // When video ends naturally (before 10 s timeout)
  const handleVideoEnded = () => {
    if (phase === 'video') setPhase('fade-out');
  };

  /* ---------- opacity helpers ---------- */
  const logoOpacity =
    phase === 'logo-in' ? 1 :
    phase === 'logo-hold' ? 1 :
    phase === 'logo-out' ? 0 : 0;

  const showLogo = phase === 'logo-in' || phase === 'logo-hold' || phase === 'logo-out';
  const showVideo = phase === 'video' || phase === 'fade-out';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        /* Fade-out overlay for the final black transition */
        opacity: phase === 'done' ? 0 : 1,
        transition: 'opacity 0ms',
      }}
    >
      {/* ── Logo phase ── */}
      {showLogo && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: logoOpacity,
            transition: 'opacity 600ms ease-in-out',
            backgroundColor: '#000000',
            zIndex: 2,
          }}
        >
          <img
            src="/icon-512.png"
            alt="BunkCalc"
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '28px',
              marginBottom: '20px',
            }}
          />
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 900,
              color: '#3b82f6',
              fontStyle: 'italic',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              margin: 0,
            }}
          >
            BunkCalc
          </h1>
          <p
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#64748b',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginTop: '6px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            Smart Attendance Tracker
          </p>
        </div>
      )}

      {/* ── Video phase ── */}
      {showVideo && (
        <div
          onClick={handleSkip}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3,
            opacity: phase === 'fade-out' ? 0 : 1,
            transition: 'opacity 300ms ease-out',
            cursor: 'pointer',
          }}
        >
          <video
            ref={videoRef}
            src="/app_launching_animation.mp4"
            autoPlay
            muted
            playsInline
            onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).playbackRate = 1.75; }}
            onEnded={handleVideoEnded}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* Skip hint */}
          <div
            style={{
              position: 'absolute',
              bottom: '48px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '8px 20px',
              borderRadius: '999px',
              backgroundColor: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.6)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              Tap to skip
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SplashScreen;
