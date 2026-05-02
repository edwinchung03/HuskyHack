import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO, isPast } from 'date-fns';
import Nav from '../components/Nav';
import AICompanion from '../components/AICompanion';
import { getDecisions, deleteDecision } from '../api';
import styles from './Decisions.module.css';

const STATUS_CFG = {
  pending: { label: 'Pending',      color: '#7c8db5' },
  correct: { label: 'Correct ✓',   color: '#2ECC71' },
  wrong:   { label: 'Wrong ✗',     color: '#E74C3C' },
  mixed:   { label: 'Mixed ~',     color: '#E8A838' },
};

function needsReview(d) {
  return d.status === 'pending' && d.follow_up_date && isPast(parseISO(d.follow_up_date));
}

export default function Decisions() {
  const [decisions, setDecisions] = useState([]);
  const [filter, setFilter]       = useState('all');
  const [loading, setLoading]     = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDecisions()
      .then(setDecisions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm('Delete this decision?')) return;
    await deleteDecision(id);
    setDecisions(ds => ds.filter(d => d.id !== id));
  }

  const filtered = decisions.filter(d => {
    if (filter === 'pending')      return d.status === 'pending' && !needsReview(d);
    if (filter === 'needs_review') return needsReview(d);
    if (filter === 'resolved')     return d.status !== 'pending';
    return true;
  });

  const counts = {
    total:        decisions.length,
    correct:      decisions.filter(d => d.status === 'correct').length,
    wrong:        decisions.filter(d => d.status === 'wrong').length,
    needs_review: decisions.filter(d => needsReview(d)).length,
  };
  const accuracy = counts.correct + counts.wrong > 0
    ? Math.round(counts.correct / (counts.correct + counts.wrong) * 100)
    : null;

  return (
    <div className={styles.page}>
      <Nav />

      <div className={styles.inner}>
        {/* Page header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Decision Log</h1>
            <p className={styles.subtitle}>Track your assumptions. Let AI reflect when outcomes are in.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/decisions/new')}>
            + New Decision
          </button>
        </div>

        {/* Stats row */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{counts.total}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
          <div className={styles.statCard} style={{ '--c': '#2ECC71' }}>
            <span className={styles.statNum} style={{ color: '#2ECC71' }}>{counts.correct}</span>
            <span className={styles.statLabel}>Correct</span>
          </div>
          <div className={styles.statCard} style={{ '--c': '#E74C3C' }}>
            <span className={styles.statNum} style={{ color: '#E74C3C' }}>{counts.wrong}</span>
            <span className={styles.statLabel}>Wrong</span>
          </div>
          {accuracy !== null && (
            <div className={styles.statCard} style={{ '--c': '#8b5cf6' }}>
              <span className={styles.statNum} style={{ color: '#8b5cf6' }}>{accuracy}%</span>
              <span className={styles.statLabel}>Accuracy</span>
            </div>
          )}
          {counts.needs_review > 0 && (
            <div className={styles.statCard} style={{ '--c': '#E8A838' }}>
              <span className={styles.statNum} style={{ color: '#E8A838' }}>{counts.needs_review}</span>
              <span className={styles.statLabel}>Need Review</span>
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className={styles.filters}>
          {[
            { key: 'all',          label: 'All' },
            { key: 'pending',      label: 'Pending' },
            { key: 'needs_review', label: `Needs Review ${counts.needs_review > 0 ? `(${counts.needs_review})` : ''}` },
            { key: 'resolved',     label: 'Resolved' },
          ].map(f => (
            <button
              key={f.key}
              className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className={styles.loader}><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <p style={{ fontSize: 36 }}>🎯</p>
            <p>No decisions here yet.</p>
            {filter === 'all' && (
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/decisions/new')}>
                Log your first decision
              </button>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(d => (
              <DecisionCard
                key={d.id}
                decision={d}
                onOpen={() => navigate(`/decisions/${d.id}`)}
                onDelete={e => handleDelete(e, d.id)}
              />
            ))}
          </div>
        )}
      </div>

      <AICompanion />
    </div>
  );
}

function DecisionCard({ decision: d, onOpen, onDelete }) {
  const cfg     = STATUS_CFG[d.status] || STATUS_CFG.pending;
  const review  = needsReview(d);
  const blinds  = d.blind_spots ? (() => { try { return JSON.parse(d.blind_spots); } catch { return []; } })() : [];

  let followUpLabel = null;
  if (d.follow_up_date) {
    const past = isPast(parseISO(d.follow_up_date));
    followUpLabel = past
      ? `Overdue ${formatDistanceToNow(parseISO(d.follow_up_date))} ago`
      : `Due in ${formatDistanceToNow(parseISO(d.follow_up_date))}`;
  }

  return (
    <div
      className={`${styles.card} ${review ? styles.reviewCard : ''}`}
      onClick={onOpen}
      role="button"
    >
      {/* Status + confidence */}
      <div className={styles.cardTop}>
        <span className={styles.statusBadge} style={{ color: cfg.color, borderColor: cfg.color + '44', background: cfg.color + '18' }}>
          {review ? '⚡ Needs Review' : cfg.label}
        </span>
        <span className={styles.confidence} data-level={d.confidence}>
          {d.confidence === 'high' ? '●●●' : d.confidence === 'medium' ? '●●○' : '●○○'}
        </span>
      </div>

      <h3 className={styles.cardTitle}>{d.title}</h3>
      <p className={styles.cardBet}>{d.core_bet || d.assumption.slice(0, 120)}{d.assumption.length > 120 ? '…' : ''}</p>

      {blinds.length > 0 && (
        <p className={styles.blindSpotHint}>⚠ {blinds.length} blind spot{blinds.length > 1 ? 's' : ''} flagged</p>
      )}

      <div className={styles.cardFooter}>
        {followUpLabel && (
          <span className={styles.dueDate} style={{ color: review ? '#E8A838' : 'var(--text-muted)' }}>
            🕐 {followUpLabel}
          </span>
        )}
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={onDelete}>×</button>
      </div>
    </div>
  );
}
