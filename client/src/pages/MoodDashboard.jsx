import { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, parseISO, isWithinInterval } from 'date-fns';
import Nav from '../components/Nav';
import MoodShape, { MOOD_CONFIG } from '../components/MoodShape';
import { getEntries, getWeeklyReport } from '../api';
import styles from './MoodDashboard.module.css';

const MOOD_SCORES = {
  angry: 1, sad: 2, anxious: 3, neutral: 5, reflective: 5.5,
  nostalgic: 6, calm: 7, grateful: 8, happy: 8.5, excited: 9,
};

// --- SVG Line Chart ---
function MoodChart({ weekDays, entryMap }) {
  const W = 560, H = 180, padL = 36, padR = 16, padT = 16, padB = 36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const points = weekDays
    .map((day, i) => {
      const key  = format(day, 'yyyy-MM-dd');
      const entry = entryMap[key];
      if (!entry) return null;
      const score = MOOD_SCORES[entry.mood_label] ?? 5;
      const x = padL + (i / 6) * chartW;
      const y = padT + chartH - ((score - 1) / 8) * chartH;
      return { x, y, score, entry, key };
    });

  const defined = points.filter(Boolean);

  // Build SVG path
  const pathD = defined.length < 2 ? '' : defined.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = defined[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `${acc} C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  // Y-axis labels
  const yLabels = [
    { score: 9, label: 'Excited' },
    { score: 7, label: 'Calm' },
    { score: 5, label: 'Neutral' },
    { score: 2, label: 'Sad' },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {yLabels.map(({ score, label }) => {
        const y = padT + chartH - ((score - 1) / 8) * chartH;
        return (
          <g key={score}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <text x={padL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.3)">{label}</text>
          </g>
        );
      })}

      {/* Gradient fill under line */}
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {pathD && (
        <path
          d={`${pathD} L ${defined[defined.length-1].x} ${padT + chartH} L ${defined[0].x} ${padT + chartH} Z`}
          fill="url(#lineGrad)"
        />
      )}

      {/* Line */}
      {pathD && (
        <path d={pathD} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Day labels on X axis */}
      {weekDays.map((day, i) => {
        const x = padL + (i / 6) * chartW;
        const label = format(day, 'EEE');
        const dateLabel = format(day, 'd');
        return (
          <g key={i}>
            <text x={x} y={H - 16} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.4)">{label}</text>
            <text x={x} y={H - 5}  textAnchor="middle" fontSize="9"  fill="rgba(255,255,255,0.25)">{dateLabel}</text>
          </g>
        );
      })}

      {/* Data points */}
      {points.map((p, i) => {
        if (!p) return null;
        const cfg = MOOD_CONFIG[p.entry.mood_label] || MOOD_CONFIG.neutral;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="7" fill={cfg.color} stroke="#0a0b0f" strokeWidth="2" />
            <circle cx={p.x} cy={p.y} r="12" fill={cfg.color} fillOpacity="0.15" />
          </g>
        );
      })}
    </svg>
  );
}

// --- Main page ---
export default function MoodDashboard() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [allEntries, setAllEntries] = useState([]);
  const [report, setReport]         = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied]         = useState(false);

  useEffect(() => {
    getEntries().then(setAllEntries).catch(console.error);
  }, []);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd   = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDays  = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  const weekEntries = allEntries.filter(e => {
    try { return isWithinInterval(parseISO(e.date), { start: weekStart, end: weekEnd }); }
    catch { return false; }
  });

  const entryMap = {};
  weekEntries.forEach(e => { entryMap[e.date] = e; });

  // Mood breakdown for this week
  const moodCounts = {};
  weekEntries.forEach(e => { moodCounts[e.mood_label || 'neutral'] = (moodCounts[e.mood_label || 'neutral'] || 0) + 1; });
  const moodBreakdown = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);

  // Average mood score
  const avgScore = weekEntries.length
    ? (weekEntries.reduce((s, e) => s + (MOOD_SCORES[e.mood_label] ?? 5), 0) / weekEntries.length).toFixed(1)
    : null;

  async function handleGenerateReport() {
    if (weekEntries.length === 0) return;
    setGenerating(true);
    setReport('');
    try {
      // Fetch full entry data for better report quality
      const res = await getWeeklyReport(weekEntries, weekLabel);
      setReport(res.report || '');
    } catch (err) {
      setReport(`Error generating report: ${err.message}`);
    }
    setGenerating(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([report], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `mood-report-${format(weekStart, 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.page}>
      <Nav />
      <div className={styles.inner}>

        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Mood Week</h1>
            <p className={styles.subtitle}>Your emotional journey, visualized week by week</p>
          </div>
        </div>

        {/* Week navigator */}
        <div className={styles.weekNav}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setWeekOffset(w => w - 1); setReport(''); }}>‹</button>
          <span className={styles.weekLabel}>{weekLabel}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => { setWeekOffset(w => w + 1); setReport(''); }}
            disabled={weekOffset >= 0}>›</button>
          {weekOffset !== 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setWeekOffset(0); setReport(''); }}>
              Today
            </button>
          )}
        </div>

        {weekEntries.length === 0 ? (
          <div className={styles.empty}>
            <p style={{ fontSize: 36 }}>📊</p>
            <p>No diary entries for this week.</p>
            <p style={{ fontSize: 12 }}>Go to Diary and write some entries to see your mood chart here.</p>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <span className={styles.statNum}>{weekEntries.length}</span>
                <span className={styles.statLabel}>Entries</span>
              </div>
              {avgScore && (
                <div className={styles.statCard}>
                  <span className={styles.statNum} style={{ color: '#8b5cf6' }}>{avgScore}</span>
                  <span className={styles.statLabel}>Avg Mood</span>
                </div>
              )}
              {moodBreakdown.slice(0, 1).map(([mood, count]) => (
                <div key={mood} className={styles.statCard}
                  style={{ '--c': MOOD_CONFIG[mood]?.color || '#888' }}>
                  <span className={styles.statNum} style={{ color: MOOD_CONFIG[mood]?.color }}>
                    <MoodShape mood={mood} size={24} glow />
                  </span>
                  <span className={styles.statLabel}>Top mood</span>
                </div>
              ))}
            </div>

            {/* Line chart */}
            <div className={styles.chartCard}>
              <p className="section-label" style={{ marginBottom: 12 }}>Mood Over the Week</p>
              <MoodChart weekDays={weekDays} entryMap={entryMap} />

              {/* Legend */}
              <div className={styles.legend}>
                {moodBreakdown.map(([mood, count]) => {
                  const cfg = MOOD_CONFIG[mood] || MOOD_CONFIG.neutral;
                  return (
                    <div key={mood} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: cfg.color }} />
                      <span className={styles.legendLabel}>{cfg.label}</span>
                      <span className={styles.legendCount}>{count}d</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily breakdown */}
            <div className={styles.dayRow}>
              {weekDays.map(day => {
                const key   = format(day, 'yyyy-MM-dd');
                const entry = entryMap[key];
                const cfg   = entry ? (MOOD_CONFIG[entry.mood_label] || MOOD_CONFIG.neutral) : null;
                return (
                  <div key={key} className={`${styles.dayCell} ${entry ? styles.dayCellFilled : ''}`}
                    style={cfg ? { '--mood': cfg.color } : {}}>
                    <span className={styles.dayCellDay}>{format(day, 'EEE')}</span>
                    {entry
                      ? <MoodShape mood={entry.mood_label} size={20} glow />
                      : <span className={styles.dayCellEmpty}>–</span>
                    }
                    <span className={styles.dayCellDate}>{format(day, 'd')}</span>
                  </div>
                );
              })}
            </div>

            {/* AI Report section */}
            <div className={styles.reportSection}>
              <div className={styles.reportHeader}>
                <div>
                  <p className={styles.reportTitle}>AI Weekly Report</p>
                  <p className={styles.reportSub}>
                    A clinical summary you can share with your doctor or therapist
                  </p>
                </div>
                <button className="btn btn-primary" onClick={handleGenerateReport} disabled={generating}>
                  {generating ? <><span className="spinner" /> Generating…</> : '✦ Generate Report'}
                </button>
              </div>

              {report && (
                <div className={styles.reportBlock}>
                  <pre className={styles.reportText}>{report}</pre>
                  <div className={styles.reportActions}>
                    <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                      {copied ? '✓ Copied' : '⎘ Copy'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleDownload}>
                      ↓ Download .txt
                    </button>
                  </div>
                </div>
              )}

              {!report && !generating && (
                <div className={styles.reportEmpty}>
                  Click <strong>Generate Report</strong> to create an AI-written clinical summary
                  of this week's emotional patterns — ready to share with a healthcare provider.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
