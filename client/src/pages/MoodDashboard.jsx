import { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, parseISO, isWithinInterval } from 'date-fns';
import Nav from '../components/Nav';
import MoodShape, { MOOD_CONFIG } from '../components/MoodShape';
import { getEntries, getWeeklyReport } from '../api';
import styles from './MoodDashboard.module.css';

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
