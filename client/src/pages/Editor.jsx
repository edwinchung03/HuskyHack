import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import AudioRecorder from '../components/AudioRecorder';
import ImagePanel from '../components/ImagePanel';
import MoodShape, { MOOD_CONFIG } from '../components/MoodShape';
import { getEntry, saveEntry, analyzeEntry } from '../api';
import styles from './Editor.module.css';

export default function Editor() {
  const { date }   = useParams();
  const navigate   = useNavigate();

  const [title, setTitle]         = useState('');
  const [body, setBody]           = useState('');
  const [audioPath, setAudioPath] = useState(null);
  const [imagePath, setImagePath] = useState(null);
  const [analysis, setAnalysis]   = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [entryId, setEntryId]     = useState(null);
  const [error, setError]         = useState('');

  const dateLabel = format(parseISO(date), 'EEEE, MMMM d, yyyy');

  useEffect(() => {
    getEntry(date)
      .then(e => {
        setTitle(e.title || '');
        setBody(e.body || '');
        setAudioPath(e.audio_path || null);
        setImagePath(e.image_path || null);
        setEntryId(e.id);
        if (e.mood_label) {
          setAnalysis({
            mood: e.mood_label,
            mood_color: e.mood_color,
            mood_shape: e.mood_shape,
            summary: e.ai_summary,
            reflection: e.ai_reflection,
            image_prompt: e.image_prompt,
          });
        }
      })
      .catch(() => {}); // new entry — no existing data
  }, [date]);

  async function handleAnalyze() {
    const text = body.trim();
    if (!text) { setError('Write something first before analyzing.'); return; }
    setError('');
    setAnalyzing(true);
    try {
      const result = await analyzeEntry(text, date);
      setAnalysis(result);
    } catch (err) {
      setError('Analysis failed: ' + err.message);
    }
    setAnalyzing(false);
  }

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      const payload = {
        date,
        title: title.trim() || dateLabel,
        body,
        audio_path: audioPath,
        image_path: imagePath,
        mood_label:    analysis?.mood        || 'neutral',
        mood_color:    analysis?.mood_color  || '#6C757D',
        mood_shape:    analysis?.mood_shape  || 'diamond',
        ai_summary:    analysis?.summary     || null,
        ai_reflection: analysis?.reflection  || null,
        image_prompt:  analysis?.image_prompt || null,
      };
      const entry = await saveEntry(payload);
      setEntryId(entry.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError('Save failed: ' + err.message);
    }
    setSaving(false);
  }

  function handleTranscript(text) {
    setBody(prev => prev ? `${prev}\n\n${text}` : text);
  }

  const moodCfg = analysis ? (MOOD_CONFIG[analysis.mood] || MOOD_CONFIG.neutral) : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Back</button>
        <div className={styles.dateBlock}>
          <p className={styles.dateLabel}>{dateLabel}</p>
          {moodCfg && (
            <div className={styles.moodPill} style={{ '--mood': moodCfg.color }}>
              <MoodShape mood={analysis.mood} size={16} glow />
              <span>{moodCfg.label}</span>
            </div>
          )}
        </div>
        <button
          className={`btn ${saved ? 'btn-secondary' : 'btn-primary'}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <><span className="spinner" /> Saving…</> : saved ? '✓ Saved' : 'Save'}
        </button>
      </header>

      <div className={styles.body}>
        <div className={styles.left}>
          {/* Title */}
          <input
            className={styles.titleInput}
            placeholder="Give this day a title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          {/* Audio */}
          <AudioRecorder
            onTranscript={handleTranscript}
            onAudioSaved={setAudioPath}
          />

          {/* Body */}
          <div>
            <p className="section-label" style={{ marginTop: 16, marginBottom: 6 }}>Your Entry</p>
            <textarea
              className={styles.bodyTextarea}
              placeholder="What happened today? How are you feeling? Let it all out…"
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={10}
            />
          </div>

          {/* Analyze button */}
          <button
            className="btn btn-secondary"
            onClick={handleAnalyze}
            disabled={analyzing || !body.trim()}
            style={{ marginTop: 8 }}
          >
            {analyzing ? <><span className="spinner" /> Analyzing…</> : '✦ AI Analyze'}
          </button>

          {error && <p className={styles.error}>{error}</p>}
        </div>

        {/* Right panel */}
        <div className={styles.right}>
          <ImagePanel
            mood={analysis?.mood}
            imagePrompt={analysis?.image_prompt}
            onImageSaved={setImagePath}
            savedImagePath={imagePath}
          />

          {/* AI Reflection */}
          {analysis && (
            <div className={`card ${styles.analysisCard} fade-up`}>
              <p className="section-label">AI Reflection</p>
              {analysis.summary && (
                <p className={styles.summary}>{analysis.summary}</p>
              )}
              {analysis.reflection && (
                <blockquote className={styles.reflection}>{analysis.reflection}</blockquote>
              )}
            </div>
          )}

          {!analysis && (
            <div className={styles.emptyAnalysis}>
              <p style={{ fontSize: 32 }}>✦</p>
              <p>Write your entry and click <strong>AI Analyze</strong> to get a mood reading, summary, and personal reflection.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
