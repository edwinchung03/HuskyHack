import { useRef, useState, useEffect } from 'react';
import { uploadImage } from '../api';
import styles from './ImagePanel.module.css';

// Generates procedural mood-based art on a canvas (always works, no API needed)
function drawMoodArt(canvas, mood, seed = Date.now()) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const rng = (() => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; }; })();

  const palettes = {
    positive:  ['#d6a171','#c78b5d','#e6c29f','#efd4b4','#f4e3cf'],
    negative:  ['#8e6a4f','#7b5a43','#aa8365','#c2a28a','#dcc4b4'],
    neutral:   ['#9f8b76','#b29f8b','#c8b7a6','#ddd1c5','#f0e7dc'],
    disturbed: ['#6e7f64','#7f8f74','#93a388','#adb8a4','#c8d0c2'],
    easy:      ['#d8bc97','#e5cda8','#eedcc2','#f6ead7','#fbf4eb'],
  };
  const normalizedMood = ['positive', 'negative', 'neutral', 'disturbed', 'easy'].includes(mood) ? mood : 'neutral';
  const colors = palettes[normalizedMood] || palettes.neutral;
  const bg = colors[0] + '22';

  ctx.fillStyle = '#f7efe2';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 6; i++) {
    const x = rng() * w, y = rng() * h, r = 60 + rng() * 140;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, colors[i % colors.length] + '55');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // Mood-specific patterns
  if (normalizedMood === 'easy') {
    ctx.strokeStyle = colors[0] + '44';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const y = h * (i / 8) + rng() * 20;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        ctx.lineTo(x, y + Math.sin(x / 40 + i) * 20);
      }
      ctx.stroke();
    }
  } else if (normalizedMood === 'positive') {
    for (let i = 0; i < 30; i++) {
      const x = rng() * w, y = rng() * h, r = 2 + rng() * 5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = colors[i % colors.length] + 'cc';
      ctx.fill();
    }
  } else if (normalizedMood === 'disturbed') {
    ctx.strokeStyle = colors[2] + '66';
    ctx.lineWidth = 1.5;
    const cx = w / 2, cy = h / 2;
    for (let r = 10; r < 120; r += 12) {
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.05) {
        const wobble = r + Math.sin(a * 5 + rng() * 2) * 6;
        const px = cx + Math.cos(a) * wobble;
        const py = cy + Math.sin(a) * wobble;
        a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
}

export default function ImagePanel({ mood, imagePrompt, onImageSaved, savedImagePath }) {
  const canvasRef  = useRef(null);
  const fileRef    = useRef(null);
  const [preview, setPreview] = useState(savedImagePath || null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (savedImagePath) setPreview(savedImagePath);
  }, [savedImagePath]);

  function generateArt() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawMoodArt(canvas, mood || 'neutral', Date.now());
    canvas.toBlob(async blob => {
      setUploading(true);
      try {
        const res = await uploadImage(blob);
        if (res.path) { setPreview(res.path); onImageSaved(res.path); }
      } finally { setUploading(false); }
    }, 'image/jpeg', 0.9);
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setUploading(true);
    try {
      const res = await uploadImage(file);
      if (res.path) { setPreview(res.path); onImageSaved(res.path); }
    } finally { setUploading(false); }
  }

  return (
    <div className={styles.wrap}>
      <p className="section-label">Memory Image</p>

      {preview ? (
        <div className={styles.previewWrap}>
          <img src={preview} alt="Entry" className={styles.preview} />
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => { setPreview(null); onImageSaved(null); }}>
            Remove
          </button>
        </div>
      ) : (
        <div className={styles.placeholder}>
          <canvas ref={canvasRef} width={400} height={220} className={styles.canvas} />
          <p className={styles.hint}>
            {imagePrompt ? `"${imagePrompt.slice(0, 80)}…"` : 'Generate AI art for this entry'}
          </p>
        </div>
      )}

      <div className={styles.actions}>
        <button className="btn btn-secondary btn-sm" onClick={generateArt} disabled={uploading}>
          {uploading ? <><span className="spinner" /> Saving…</> : '✦ Generate Art'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
          ↑ Upload Image
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
      </div>
    </div>
  );
}
