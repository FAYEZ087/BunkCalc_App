import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * SplashScreen: Clean logo launch sequence.
 *
 * Flow:
 *   1. Logo fades in (600 ms) → holds (800 ms) → fades out (400 ms)
 *   2. Calls onComplete – parent detects theme & fades in home
 */

type Phase = 'logo-in' | 'logo-hold' | 'logo-out' | 'done';

interface Props {
  onComplete: () => void;
}

const SplashScreen: React.FC<Props> = ({ onComplete }) => {
  const [phase, setPhase] = useState<Phase>('logo-in');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const after = useCallback((ms: number, next: Phase) => {
    timerRef.current = setTimeout(() => setPhase(next), ms);
  }, []);

  useEffect(() => {
    switch (phase) {
      case 'logo-in':
        after(500, 'logo-hold');
        break;
      case 'logo-hold':
        after(800, 'logo-out');
        break;
      case 'logo-out':
        after(400, 'done');
        break;
      case 'done':
        onComplete();
        break;
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, after, onComplete]);

  const logoOpacity =
    phase === 'logo-in' ? 1 :
    phase === 'logo-hold' ? 1 : 0;

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
        opacity: phase === 'done' ? 0 : 1,
        transition: 'opacity 300ms ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          opacity: logoOpacity,
          transition: 'opacity 500ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <img
          src="/BunkCalc_App_Logo.png"
          alt="BunkCalc Logo"
          style={{
            width: '120px',
            height: '120px',
            objectFit: 'contain',
            borderRadius: '24px',
            boxShadow: '0 20px 50px rgba(59, 130, 246, 0.3)',
          }}
        />
        <h1
          style={{
            color: '#3b82f6',
            fontSize: '32px',
            fontWeight: 900,
            fontStyle: 'italic',
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          BunkCalc
        </h1>
        <p
          style={{
            color: '#64748b',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Smart Attendance Tracker
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
