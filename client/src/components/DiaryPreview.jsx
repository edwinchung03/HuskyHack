import { format, parseISO } from 'date-fns';
import MoodShape, { MOOD_CONFIG } from './MoodShape';
import styles from './DiaryPreview.module.css';

export default function DiaryPreview({ entry, onClose, onEdit }) {
  if (!entry) return null;
  const moodCfg = MOOD_CONFIG[entry.mood_label] || MOOD_CONFIG.neutral;
  const dateLabel = format(parseISO(entry.date), 'EEEE, MMMM d, yyyy');

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-up" style={{ maxWidth: 520 }}>
        {/* Date + mood */}
        <div className={styles.top}>
          <div>
            <p className={styles.dateStr}>{dateLabel}</p>
            <h2 className={styles.title}>{entry.title || 'Untitled Entry'}</h2>
          </div>
          <div className={styles.moodBadge} style={{ '--mood': moodCfg.color }}>
            <MoodShape mood={entry.mood_label} size={26} glow />
            <span style={{ color: moodCfg.color }}>{moodCfg.label}</span>
          </div>
        </div>

        {/* Image */}
        {entry.image_path && (
          <div className={styles.imageWrap}>
            <img src={entry.image_path} alt="Entry" className={styles.image} />
          </div>
        )}

        {/* AI Summary */}
        {entry.ai_summary && (
          <div className={styles.summaryBlock}>
            <p className="section-label">AI Summary</p>
            <p className={styles.summaryText}>{entry.ai_summary}</p>
          </div>
        )}

        {/* Reflection */}
        {entry.ai_reflection && (
          <div className={styles.reflectionBlock}>
            <p className="section-label">Reflection</p>
            <p className={styles.reflectionText}>{entry.ai_reflection}</p>
          </div>
        )}

        {/* Body preview */}
        {entry.body && (
          <div className={styles.bodyPreview}>
            <p className="section-label">Entry</p>
            <p className={styles.bodyText}>{entry.body.slice(0, 280)}{entry.body.length > 280 ? '…' : ''}</p>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={onEdit}>Edit Entry</button>
        </div>
      </div>
    </div>
  );
}
