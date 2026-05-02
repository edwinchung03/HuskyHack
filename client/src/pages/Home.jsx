import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  function handleNewEntry(dateStr) {
    navigate(`/editor/${dateStr}`);
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

      <AICompanion />
    </div>
  );
}
