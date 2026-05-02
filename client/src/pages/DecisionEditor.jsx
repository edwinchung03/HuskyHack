import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import { getDecision, createDecision, updateDecision, deleteDecision, reviewDecision } from '../api';
import styles from './DecisionEditor.module.css';

const CONFIDENCE_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };

export default function DecisionEditor() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isNew    = !id;

  const [form, setForm] = useState({
    title: '', assumption: '', expected_outcome: '', context: '', follow_up_date: '',
  });
  const [decision, setDecision]     = useState(null);
  const [analysis, setAnalysis]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const [reviewing, setReviewing]   = useState(false);
  const [actualOutcome, setActual]  = useState('');
  const [reflection, setReflection] = useState(null);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (!isNew) {
      getDecision(id).then(d => {
        setDecision(d);
        setForm({
          title:            d.title,
          assumption:       d.assumption,
          expected_outcome: d.expected_outcome || '',
          context:          d.context || '',
          follow_up_date:   d.follow_up_date || '',
        });
        if (d.confidence || d.core_bet) {
          setAnalysis({
            confidence:  d.confidence,
            core_bet:    d.core_bet,
            blind_spots: d.blind_spots ? (() => { try { return JSON.parse(d.blind_spots); } catch { return []; } })() : [],
            questions:   d.ai_questions ? (() => { try { return JSON.parse(d.ai_questions); } catch { return []; } })() : [],
            summary:     d.ai_analysis,
            mood:        d.mood_label,
          });
        }
        if (d.actual_outcome) setActual(d.actual_outcome);
        if (d.ai_reflection) setReflection({ reflection: d.ai_reflection, verdict: d.status });
      }).catch(() => navigate('/decisions'));
    }
  }, [id]);

  function set(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  async function handleSave() {
    setError('');
    if (!form.title.trim() || !form.assumption.trim()) {
      setError('Title and assumption are required.');
      return;
    }
    setSaving(true);
    try {
      const data = isNew
        ? await createDecision(form)
        : await updateDecision(id, form);
      setDecision(data);
      if (isNew) navigate(`/decisions/${data.id}`, { replace: true });
      if (data.core_bet || data.confidence) {
        setAnalysis({
          confidence:  data.confidence,
          core_bet:    data.core_bet,
          blind_spots: data.blind_spots ? (() => { try { return JSON.parse(data.blind_spots); } catch { return []; } })() : [],
          questions:   data.ai_questions ? (() => { try { return JSON.parse(data.ai_questions); } catch { return []; } })() : [],
          summary:     data.ai_analysis,
          mood:        data.mood_label,
        });
      }
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  async function handleReview() {
    if (!actualOutcome.trim()) { setError('Describe what actually happened.'); return; }
    setError('');
    setReviewing(true);
    try {
      const res = await reviewDecision(decision.id, { actual_outcome: actualOutcome });
      setDecision(res.decision);
      setReflection(res.reflection);
    } catch (err) {
      setError(err.message);
    }
    setReviewing(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this decision permanently?')) return;
    await deleteDecision(decision.id);
    navigate('/decisions');
  }

  const isResolved = decision?.status && decision.status !== 'pending';
  const verdictCfg = {
    correct: { label: 'Correct', color: '#2ECC71' },
    wrong:   { label: 'Wrong',   color: '#E74C3C' },
    mixed:   { label: 'Mixed',   color: '#E8A838' },
  };

  return (
    <div className={styles.page}>
      <Nav />
      <div className={styles.inner}>

        {/* Header */}
        <div className={styles.header}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/decisions')}>← Back</button>
          <h1 className={styles.pageTitle}>{isNew ? 'New Decision' : 'Decision'}</h1>
          <div className={styles.headerActions}>
            {!isNew && <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner" /> Saving…</> : isNew ? 'Save & Analyze' : 'Save'}
            </button>
          </div>
        </div>

        <div className={styles.body}>
          {/* Left: form */}
          <div className={styles.left}>
            <div className={styles.field}>
              <label className="section-label">Decision Title *</label>
              <input
                placeholder="e.g. Pivot to B2B sales model"
                value={form.title}
                onChange={set('title')}
              />
            </div>

            <div className={styles.field}>
              <label className="section-label">Your Assumption *</label>
              <textarea
                rows={4}
                placeholder="What are you betting on? e.g. Enterprise customers will pay 10× what consumers pay for the same product."
                value={form.assumption}
                onChange={set('assumption')}
              />
            </div>

            <div className={styles.field}>
              <label className="section-label">Expected Outcome</label>
              <textarea
                rows={3}
                placeholder="What does success look like in concrete terms? e.g. MRR doubles within 6 months."
                value={form.expected_outcome}
                onChange={set('expected_outcome')}
              />
            </div>

            <div className={styles.field}>
              <label className="section-label">Context / Notes</label>
              <textarea
                rows={3}
                placeholder="Why are you making this decision now? What led to this?"
                value={form.context}
                onChange={set('context')}
              />
            </div>

            <div className={styles.field}>
              <label className="section-label">Follow-up Date</label>
              <input
                type="date"
                value={form.follow_up_date}
                onChange={set('follow_up_date')}
                style={{ maxWidth: 200 }}
              />
              <p className={styles.fieldHint}>When will you know if this assumption held?</p>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            {/* Outcome review section */}
            {!isNew && decision && !isResolved && (
              <div className={styles.reviewSection}>
                <p className="section-label">Record Outcome</p>
                <p className={styles.reviewHint}>What actually happened? AI will reflect and store this as a permanent memory.</p>
                <textarea
                  rows={4}
                  placeholder="Describe the actual outcome — be honest about what worked and what didn't."
                  value={actualOutcome}
                  onChange={e => setActual(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 10 }}
                  onClick={handleReview}
                  disabled={reviewing || !actualOutcome.trim()}
                >
                  {reviewing ? <><span className="spinner" /> Reflecting…</> : '✦ Submit Outcome'}
                </button>
              </div>
            )}

            {/* Resolved outcome display */}
            {isResolved && decision?.actual_outcome && (
              <div className={styles.resolvedBlock}>
                <p className="section-label">Actual Outcome</p>
                <p className={styles.actualText}>{decision.actual_outcome}</p>
              </div>
            )}
          </div>

          {/* Right: AI analysis panel */}
          <div className={styles.right}>
            {/* Verdict badge (if resolved) */}
            {reflection || isResolved ? (
              <div className={styles.verdictCard}
                style={{ '--verdict-color': verdictCfg[reflection?.verdict || decision?.status]?.color || '#888' }}>
                <div className={styles.verdictBadge}>
                  {verdictCfg[reflection?.verdict || decision?.status]?.label || 'Mixed'}
                </div>
                {reflection?.accuracy_score != null && (
                  <div className={styles.accuracyBar}>
                    <div className={styles.accuracyFill} style={{ width: `${reflection.accuracy_score}%` }} />
                    <span>{reflection.accuracy_score}% accurate</span>
                  </div>
                )}
                {(reflection?.reflection || decision?.ai_reflection) && (
                  <blockquote className={styles.verdictReflection}>
                    {reflection?.reflection || decision.ai_reflection}
                  </blockquote>
                )}
                {reflection?.key_learning && (
                  <div className={styles.keyLearning}>
                    <span className={styles.keyLearningLabel}>Key Learning</span>
                    <p>{reflection.key_learning}</p>
                  </div>
                )}
                {reflection?.what_got_right && (
                  <div className={styles.outcomeDetail} style={{ '--c': '#2ECC71' }}>
                    <span>✓ Got right</span><p>{reflection.what_got_right}</p>
                  </div>
                )}
                {reflection?.what_missed && (
                  <div className={styles.outcomeDetail} style={{ '--c': '#E74C3C' }}>
                    <span>✗ Missed</span><p>{reflection.what_missed}</p>
                  </div>
                )}
              </div>
            ) : analysis ? (
              <div className={`card fade-up ${styles.analysisCard}`}>
                <div className={styles.analysisTop}>
                  <span className={styles.moodTag}>{analysis.mood}</span>
                  <span className={styles.confTag} data-level={analysis.confidence}>
                    {CONFIDENCE_LABELS[analysis.confidence] || 'Medium'} confidence
                  </span>
                </div>

                {analysis.core_bet && (
                  <div className={styles.coreBet}>
                    <p className="section-label">Core Bet</p>
                    <p className={styles.coreBetText}>"{analysis.core_bet}"</p>
                  </div>
                )}

                {analysis.blind_spots?.length > 0 && (
                  <div className={styles.aiList}>
                    <p className="section-label">⚠ Blind Spots</p>
                    <ul>
                      {analysis.blind_spots.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </div>
                )}

                {analysis.questions?.length > 0 && (
                  <div className={styles.aiList}>
                    <p className="section-label">❓ Questions to Answer</p>
                    <ul>
                      {analysis.questions.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.emptyAnalysis}>
                <p style={{ fontSize: 32 }}>🎯</p>
                <p>Fill in your assumption and click <strong>Save & Analyze</strong> — AI will identify your core bet, blind spots, and the questions you should be asking.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
