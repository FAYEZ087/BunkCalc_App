import React from 'react';
import type { Subject, AttendanceRecord } from '../lib/types';
import { calculateSubjectStats } from '../lib/calculations';

interface Props {
  subjects: Subject[];
  records: AttendanceRecord[];
}

// Returns raw hex color for a given attendance percentage.
// MUST use hex/rgb — NO Tailwind classes (Tailwind v4 uses oklch() which html2canvas cannot parse).
function getStatusHex(pct: number): string {
  if (pct >= 85) return '#22c55e'; // green-500
  if (pct >= 75) return '#f59e0b'; // amber-500
  return '#ef4444';                // red-500
}

const ShareCard: React.FC<Props> = ({ subjects, records }) => {
  const totalAttended = subjects.reduce((acc, s) => acc + calculateSubjectStats(s, records).attendedCount, 0);
  const totalPossible = subjects.reduce((acc, s) => acc + calculateSubjectStats(s, records).totalClasses, 0);
  const overallPct = totalPossible === 0 ? 100 : (totalAttended / totalPossible) * 100;
  const isSafe = overallPct >= 75;

  return (
    <div
      id="share-card"
      style={{
        width: '375px',
        minHeight: '580px',
        backgroundColor: '#020617',
        color: '#ffffff',
        padding: '24px',
        borderRadius: '24px',
        border: '1px solid #1e293b',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{
          fontSize: '32px',
          fontWeight: 900,
          color: '#3b82f6',
          fontStyle: 'italic',
          textTransform: 'uppercase',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          BunkCalc
        </h2>
        <p style={{
          color: '#64748b',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          margin: '4px 0 0 0',
        }}>
          Attendance Report
        </p>
      </div>

      {/* Overall percentage card */}
      <div style={{
        backgroundColor: '#0f172a',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
        textAlign: 'center',
        border: '1px solid #1e293b',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>
          Overall Attendance
        </p>
        <p style={{ fontSize: '56px', fontWeight: 900, margin: '0 0 12px 0', lineHeight: 1 }}>
          {overallPct.toFixed(1)}%
        </p>
        <div style={{
          display: 'inline-block',
          padding: '4px 16px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 900,
          textTransform: 'uppercase',
          backgroundColor: isSafe ? '#22c55e' : '#ef4444',
          color: '#ffffff',
        }}>
          {isSafe ? 'Safe' : 'At Risk'}
        </div>
      </div>

      {/* Per-subject rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', flex: 1 }}>
        {subjects.map((s) => {
          const stats = calculateSubjectStats(s, records);
          const statusColor = getStatusHex(stats.attendancePct);
          return (
            <div key={s.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#0f172a',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid #1e293b',
            }}>
              <span style={{ fontWeight: 700, fontSize: '13px', color: '#f1f5f9', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {stats.attendedCount}/{stats.totalClasses}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: statusColor,
                  color: '#ffffff',
                }}>
                  {stats.attendancePct.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        borderTop: '1px solid #1e293b',
        paddingTop: '16px',
        marginTop: 'auto',
      }}>
        <p style={{ color: '#475569', fontSize: '9px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          Generated via BunkCalc • Manage your bunks like a pro
        </p>
      </div>
    </div>
  );
};

export default ShareCard;
