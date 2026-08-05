import React from 'react';
import type { Subject, AttendanceRecord } from '../lib/types';
import { calculateSubjectStats } from '../lib/calculations';
import { useSettings } from '../store/useSettings';

interface Props {
  subjects: Subject[];
  records: AttendanceRecord[];
}

function getStatusHex(pct: number): string {
  if (pct >= 85) return '#22c55e'; // green-500
  if (pct >= 75) return '#f59e0b'; // amber-500
  return '#ef4444';                // red-500
}

const ShareCard: React.FC<Props> = ({ subjects, records }) => {
  const settings = useSettings((state) => state.settings);

  const totalAttended = subjects.reduce((acc, s) => acc + calculateSubjectStats(s, records, settings.semesterEndDate, settings.holidays).attendedCount, 0);
  const totalPossible = subjects.reduce((acc, s) => acc + calculateSubjectStats(s, records, settings.semesterEndDate, settings.holidays).totalClasses, 0);
  const overallPct = totalPossible === 0 ? 100 : (totalAttended / totalPossible) * 100;
  const isSafe = overallPct >= 75;
  const totalBunksLeft = subjects.reduce((acc, s) => acc + Math.max(0, calculateSubjectStats(s, records, settings.semesterEndDate, settings.holidays).bunkBudget), 0);

  return (
    <div
      id="share-card"
      style={{
        width: '375px',
        height: '667px', // Exact 9:16 Aspect Ratio (Story Dimensions)
        backgroundColor: '#020617',
        color: '#ffffff',
        padding: '24px',
        borderRadius: '24px',
        border: '1px solid #1e293b',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Glow */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        width: '160px',
        height: '160px',
        backgroundColor: '#3b82f6',
        opacity: 0.15,
        borderRadius: '999px',
        filter: 'blur(40px)',
      }}></div>

      {/* Top Header */}
      <div style={{ textAlign: 'center', marginTop: '8px' }}>
        <h2 style={{
          fontSize: '34px',
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
          fontWeight: 800,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          margin: '4px 0 0 0',
        }}>
          Semester Attendance Story
        </p>
      </div>

      {/* Main Overall Percentage Hero Card */}
      <div style={{
        backgroundColor: '#0f172a',
        borderRadius: '20px',
        padding: '20px',
        textAlign: 'center',
        border: '1px solid #1e293b',
        position: 'relative',
      }}>
        <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px 0' }}>
          Overall Score
        </p>
        <p style={{ fontSize: '54px', fontWeight: 900, margin: '0 0 8px 0', lineHeight: 1, color: getStatusHex(overallPct) }}>
          {overallPct.toFixed(1)}%
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
          <span style={{
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '10px',
            fontWeight: 900,
            textTransform: 'uppercase',
            backgroundColor: isSafe ? '#22c55e' : '#ef4444',
            color: '#ffffff',
          }}>
            {isSafe ? '🛡️ SAFE ZONE' : '🚨 DANGER ZONE'}
          </span>
          <span style={{
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '10px',
            fontWeight: 900,
            textTransform: 'uppercase',
            backgroundColor: '#1e293b',
            color: '#38bdf8',
          }}>
            ⚡ {totalBunksLeft} Safe Bunks
          </span>
        </div>
      </div>

      {/* Subject Breakdown List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
        <p style={{ color: '#64748b', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2px 0' }}>
          Subject Breakdown
        </p>
        {subjects.slice(0, 6).map((s) => {
          const stats = calculateSubjectStats(s, records, settings.semesterEndDate, settings.holidays);
          const statusColor = getStatusHex(stats.attendancePct);
          return (
            <div key={s.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#0f172a',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid #1e293b',
            }}>
              <span style={{ fontWeight: 700, fontSize: '13px', color: '#f1f5f9', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: stats.bunkBudget >= 0 ? '#4ade80' : '#f87171' }}>
                  {stats.bunkBudget >= 0 ? `${stats.bunkBudget} bunks left` : `Need ${stats.classesNeededToRecover} classes`}
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

      {/* Footer Branding */}
      <div style={{
        textAlign: 'center',
        borderTop: '1px solid #1e293b',
        paddingTop: '12px',
        marginBottom: '4px',
      }}>
        <p style={{ color: '#475569', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
          BunkCalc • Smart Attendance Manager
        </p>
      </div>
    </div>
  );
};

export default ShareCard;
