import React, { useEffect, useState } from 'react';

interface Props {
  type: 'present' | 'absent' | null;
  onDone: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  speedX: number;
  speedY: number;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#a855f7', '#10b981'];

const CelebrationOverlay: React.FC<Props> = ({ type, onDone }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!type) return;

    if (type === 'present') {
      // Generate 40 confetti particles
      const newParticles: Particle[] = Array.from({ length: 45 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // %
        y: -10 - Math.random() * 20, // %
        size: Math.random() * 8 + 6, // px
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        speedX: (Math.random() - 0.5) * 40,
        speedY: Math.random() * 80 + 100,
      }));
      setParticles(newParticles);
    }

    const timer = setTimeout(() => {
      onDone();
    }, 1600);

    return () => clearTimeout(timer);
  }, [type, onDone]);

  if (!type) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden flex items-center justify-center">
      {type === 'present' && (
        <>
          {/* Confetti particles */}
          {particles.map((p) => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size * 1.4}px`,
                backgroundColor: p.color,
                borderRadius: '2px',
                transform: `rotate(${p.rotation}deg)`,
                animation: `confettiFall 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
              }}
            />
          ))}

          {/* Central Present Celebration Toast */}
          <div className="bg-emerald-600 text-white font-black px-6 py-3 rounded-full shadow-2xl border-2 border-emerald-300 animate-in zoom-in-50 fade-in duration-200 flex items-center gap-2 text-sm tracking-wider uppercase">
            <span className="text-xl">🎉</span> GREAT JOB! ATTENDED!
          </div>
        </>
      )}

      {type === 'absent' && (
        <div className="inset-0 absolute bg-red-500/20 animate-pulse border-4 border-red-500/50 rounded-none flex items-center justify-center pointer-events-none">
          <div className="bg-red-600 text-white font-black px-6 py-3 rounded-full shadow-2xl border-2 border-red-300 animate-in zoom-in-50 fade-in duration-200 flex items-center gap-2 text-sm tracking-wider uppercase">
            <span className="text-xl">⚠️</span> ABSENT LOGGED!
          </div>
        </div>
      )}

      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default CelebrationOverlay;
