import { useState, useRef } from 'react';
import { transcribeAudio, uploadAudio } from '../api';
import styles from './AudioRecorder.module.css';

// States: idle -> recording -> stopped -> (transcribing | saving) -> idle
export default function AudioRecorder({ onUseTranscript, onAudioSaved }) {
  const [state, setState] = useState('idle');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState('');

  const blobRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  async function startRecording() {
    setError('');
    setAudioUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        blobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        setState('stopped');
      };

      recorder.start();
      setState('recording');
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      setError('Microphone access denied');
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    mediaRef.current?.stop();
    mediaRef.current?.stream.getTracks().forEach(t => t.stop());
  }

  async function saveAudioBlob() {
    const blob = blobRef.current;
    if (!blob) return;
    const res = await uploadAudio(blob);
    if (res.path) onAudioSaved(res.path);
  }

  async function handleTranscribe() {
    if (!blobRef.current) return;
    setState('transcribing');
    setError('');
    try {
      const [transcribeRes] = await Promise.all([
        transcribeAudio(blobRef.current),
        saveAudioBlob(),
      ]);
      if (transcribeRes.transcript) onUseTranscript(transcribeRes.transcript);
      setState('idle');
    } catch (err) {
      setError('Transcription failed: ' + err.message);
      setState('stopped');
    }
  }

  async function handleKeepRecording() {
    if (!blobRef.current) return;
    setState('saving');
    setError('');
    try {
      await saveAudioBlob();
      setState('idle');
    } catch (err) {
      setError('Save failed: ' + err.message);
      setState('stopped');
    }
  }

  function handleDiscard() {
    blobRef.current = null;
    setAudioUrl(null);
    setState('idle');
  }

  function fmt(s) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  return (
    <div className={styles.wrap}>
      <p className="section-label">Voice Recording</p>

      {state === 'idle' && (
        <div className={styles.controls}>
          <button className="btn btn-secondary" onClick={startRecording}>
            <span className={styles.micDot} /> Record
          </button>
          {audioUrl && <audio controls src={audioUrl} className={styles.player} />}
        </div>
      )}

      {state === 'recording' && (
        <div className={styles.controls}>
          <button className="btn btn-danger" onClick={stopRecording} style={{ animation: 'recordPulse 1s ease infinite' }}>
            <span className={styles.stopSquare} /> Stop {fmt(duration)}
          </button>
          <span className={styles.recIndicator}>● REC</span>
        </div>
      )}

      {state === 'stopped' && (
        <div className={styles.stoppedBlock}>
          <audio controls src={audioUrl} className={styles.player} />
          <p className={styles.choiceLabel}>What would you like to do?</p>
          <div className={styles.choiceRow}>
            <button className="btn btn-primary btn-sm" onClick={handleTranscribe}>
              Transcribe it
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleKeepRecording}>
              Keep recording only
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleDiscard}>
              Discard
            </button>
          </div>
        </div>
      )}

      {state === 'transcribing' && (
        <div className={styles.controls}>
          <button className="btn btn-secondary" disabled>
            <span className="spinner" /> Transcribing with Gemini…
          </button>
        </div>
      )}

      {state === 'saving' && (
        <div className={styles.controls}>
          <button className="btn btn-secondary" disabled>
            <span className="spinner" /> Saving recording…
          </button>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <p className={styles.hint}>
        {state === 'idle' && 'Record your thoughts — then transcribe them into your diary or keep just the audio.'}
        {state === 'recording' && 'Speak clearly… recording in progress.'}
        {state === 'transcribing' && 'Sending to Gemini — transcript will be appended to your entry.'}
        {state === 'saving' && 'Audio is being saved to your entry.'}
      </p>
    </div>
  );
}
