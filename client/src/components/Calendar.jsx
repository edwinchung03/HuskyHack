import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday } from 'date-fns';
import MoodShape, { MOOD_CONFIG } from './MoodShape';
import styles from './Calendar.module.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar({ entries = [], onDayClick, onNewEntry }) {
  const [current, setCurrent] = useState(new Date());

  const entryMap = {};
  entries.forEach(e => { entryMap[e.date] = e; });

  const monthStart = startOfMonth(current);
  const monthEnd   = endOfMonth(current);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad   = getDay(monthStart);

  function prev() { setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
  function next() { setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); }

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <button className="btn btn-ghost btn-sm" onClick={prev}>‹</button>
        <h2 className={styles.monthTitle}>{format(current, 'MMMM yyyy')}</h2>
        <button className="btn btn-ghost btn-sm" onClick={next}>›</button>
      </div>

      {/* Day-of-week labels */}
      <div className={styles.grid}>
        {DAYS.map(d => (
          <div key={d} className={styles.dayLabel}>{d}</div>
        ))}

        {/* Empty cells before month start */}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className={styles.cell} />
        ))}

        {/* Day cells */}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const entry   = entryMap[dateStr];
          const today   = isToday(day);
          const moodCfg = entry ? (MOOD_CONFIG[entry.mood_label] || MOOD_CONFIG.neutral) : null;

          return (
            <button
              key={dateStr}
              className={[
                styles.cell,
                styles.dayCell,
                today   ? styles.today   : '',
                entry   ? styles.hasEntry : '',
              ].join(' ')}
              style={entry ? { '--mood-color': moodCfg.color } : {}}
              onClick={() => onDayClick(dateStr, entry)}
              title={entry ? entry.title || dateStr : dateStr}
            >
              <span className={styles.dayNum}>{format(day, 'd')}</span>
              {entry && (
                <span className={styles.moodIcon}>
                  <MoodShape mood={entry.mood_label} size={20} glow />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* + New diary button */}
      <button
        className={styles.fab}
        onClick={() => onNewEntry(format(new Date(), 'yyyy-MM-dd'))}
        title="New diary entry"
      >
        +
      </button>
    </div>
  );
}
