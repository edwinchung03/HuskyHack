import { useState, useRef } from 'react';
import { transcribeAudio, uploadAudio } from '../api';
import styles from './AudioRecorder.module.css';

export default function AudioRecorder({ onUseTranscript, onAudioSaved }) {
  const [state, setState] = useState('idle'); // idle | recording | processing | transcribing
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState('');

  const mediaRef   = useRef(null);
  const chunksRef  = useRef([]);
  const timerRef   = useRef(null);

  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => chunksRef.current.push(e.data);
      recorder.onstop = handleStop;
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
    setState('processing');
  }

  async function handleStop() {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    const url  = URL.createObjectURL(blob);
    setAudioUrl(url);
    setAudioBlob(blob);

    try {
      const uploadRes = await uploadAudio(blob);
      if (uploadRes.path) onAudioSaved(uploadRes.path);
    } catch (err) {
      setError('Audio upload failed: ' + err.message);
    }
    setState('idle');
  }

  async function handleTranscribe() {
    if (!audioBlob) return;
    setError('');
    setState('transcribing');
    try {
      const transcribeRes = await transcribeAudio(audioBlob);
      if (transcribeRes.transcript) onUseTranscript(transcribeRes.transcript);
    } catch (err) {
      setError('Transcription failed: ' + err.message);
    }
    setState('idle');
  }

  function fmt(s) {
    return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  }

  return (
    <div className={styles.wrap}>
      <p className="section-label">Voice Recording</p>

      <div className={styles.controls}>
        {state === 'idle' && (
          <button className="btn btn-secondary" onClick={startRecording}>
            <span className={styles.micDot} /> Record
          </button>
        )}
        {state === 'recording' && (
          <button className="btn btn-danger" onClick={stopRecording} style={{ animation: 'recordPulse 1s ease infinite' }}>
            <span className={styles.stopSquare} /> Stop  {fmt(duration)}
          </button>
        )}
        {state === 'processing' && (
          <button className="btn btn-secondary" disabled>
            <span className="spinner" /> Saving audio…
          </button>
        )}
        {state === 'transcribing' && (
          <button className="btn btn-secondary" disabled>
            <span className="spinner" /> Transcribing…
          </button>
        )}

        {audioUrl && state === 'idle' && (
          <>
            <audio controls src={audioUrl} className={styles.player} />
            <button className="btn btn-secondary btn-sm" onClick={handleTranscribe}>
              Transcribe it 
            </button>
          </>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <p className={styles.hint}>
        {state === 'recording' ? 'Speak clearly… recording in progress.' : ''}
        {state === 'processing' ? 'Saving your audio recording…' : ''}
        {state === 'transcribing' ? 'Transcribing your recording into diary text…' : ''}
      </p>
    </div>
  );
}
