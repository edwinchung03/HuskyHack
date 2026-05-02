import { useRef, useState, useEffect } from 'react';
import { uploadImage } from '../api';
import styles from './ImagePanel.module.css';

// Generates procedural mood-based art on a canvas (always works, no API needed)
function drawMoodArt(canvas, mood, seed = Date.now()) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const rng = (() => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; }; })();

  const palettes = {
    happy:      ['#FFD700','#FF9E00','#FFF176','#FFAB40','#FFE082'],
    excited:    ['#FF6B35','#FF4081','#FF6E40','#FF3D00','#FF6D00'],
    calm:       ['#4ECDC4','#26A69A','#80CBC4','#00BCD4','#B2EBF2'],
    sad:        ['#5B8DB8','#3A7BD5','#5C6BC0','#7986CB','#90A4AE'],
    anxious:    ['#9B59B6','#8E44AD','#CE93D8','#AB47BC','#7B1FA2'],
    angry:      ['#E74C3C','#C0392B','#FF5252','#FF1744','#B71C1C'],
    reflective: ['#A0A8C0','#78909C','#B0BEC5','#90A4AE','#607D8B'],
    grateful:   ['#2ECC71','#27AE60','#A5D6A7','#66BB6A','#43A047'],
    nostalgic:  ['#E8A838','#F9A825','#FFD54F','#FFB300','#FF8F00'],
    neutral:    ['#6C757D','#868E96','#ADB5BD','#495057','#343A40'],
  };
  const colors = palettes[mood] || palettes.neutral;
  const bg = colors[0] + '22';

  ctx.fillStyle = '#0d0e1c';
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
  if (mood === 'calm' || mood === 'reflective') {
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
  } else if (mood === 'happy' || mood === 'grateful') {
    for (let i = 0; i < 30; i++) {
      const x = rng() * w, y = rng() * h, r = 2 + rng() * 5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = colors[i % colors.length] + 'cc';
      ctx.fill();
    }
  } else if (mood === 'anxious') {
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
