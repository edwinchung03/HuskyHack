import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Nav from '../components/Nav';
import Calendar from '../components/Calendar';
import DiaryPreview from '../components/DiaryPreview';
import AICompanion from '../components/AICompanion';
import { getEntries, getEntry } from '../api';
import styles from './Home.module.css';

export default function Home() {
  const [entries, setEntries]       = useState([]);
  const [preview, setPreview]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [showDateModal, setShowDateModal] = useState(false);
  const [newEntryDate, setNewEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const navigate = useNavigate();

  useEffect(() => {
    getEntries()
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleDayClick(dateStr, entrySummary) {
    if (!entrySummary) {
      navigate(`/editor/${dateStr}`);
      return;
    }
    try {
      const full = await getEntry(dateStr);
      setPreview(full);
    } catch {
      setPreview(entrySummary);
    }
  }

  function handleNewEntry() {
    setNewEntryDate(format(new Date(), 'yyyy-MM-dd'));
    setShowDateModal(true);
  }

  function handleCreateForDate() {
    navigate(`/editor/${newEntryDate}`, { state: { mode: 'new' } });
    setShowDateModal(false);
  }

  return (
    <div className={styles.page}>
      <Nav />

      <main className={styles.main}>
        {loading ? (
          <div className={styles.loader}><span className="spinner" /></div>
        ) : (
          <Calendar
            entries={entries}
            onDayClick={handleDayClick}
            onNewEntry={handleNewEntry}
          />
        )}
      </main>

      {preview && (
        <DiaryPreview
          entry={preview}
          onClose={() => setPreview(null)}
          onEdit={() => { navigate(`/editor/${preview.date}`); setPreview(null); }}
        />
      )}

      {showDateModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDateModal(false)}>
          <div className={`modal ${styles.dateModal} fade-up`}>
            <button className={styles.closeBtn} onClick={() => setShowDateModal(false)} aria-label="Close">
              ×
            </button>
            <p className="section-label">New Diary</p>
            <h2 className={styles.modalTitle}>Choose a diary date</h2>
            <p className={styles.modalCopy}>Pick any day you want to write about, including past days.</p>
            <label className={styles.dateField}>
              <span>Date of diary</span>
              <input
                type="date"
                value={newEntryDate}
                onChange={e => setNewEntryDate(e.target.value)}
              />
            </label>
            <div className={styles.modalActions}>
              <button className="btn btn-ghost" onClick={() => setShowDateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateForDate} disabled={!newEntryDate}>Continue</button>
            </div>
          </div>
        </div>
      )}

      <AICompanion />
    </div>
  );
}
