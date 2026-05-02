import { useRef, useState, useEffect } from 'react';
import { uploadImage } from '../api';
import styles from './ImagePanel.module.css';

const COMIC_CONFIG = {
  happy:      { bg: '#FFE500', dot: '#FF9E00', accent: '#FF3D00', text: 'YAY!',    shape: 'star'      },
  excited:    { bg: '#FF4500', dot: '#FF8C00', accent: '#FFFF00', text: 'POW!',    shape: 'lightning' },
  calm:       { bg: '#00C9C8', dot: '#007F7F', accent: '#FFFFFF', text: 'ahhh...', shape: 'circle'    },
  sad:        { bg: '#4A90D9', dot: '#1A3A6B', accent: '#FFFFFF', text: '*sigh*',  shape: 'teardrop'  },
  anxious:    { bg: '#9B3FB5', dot: '#5C1A7A', accent: '#FFE500', text: '!!!',     shape: 'spiral'    },
  angry:      { bg: '#E8000D', dot: '#7A0008', accent: '#FFE500', text: 'ARGH!',   shape: 'flame'     },
  reflective: { bg: '#7B8FA8', dot: '#3A4D66', accent: '#FFFFFF', text: 'hmm...',  shape: 'moon'      },
  grateful:   { bg: '#00C853', dot: '#005C20', accent: '#FFFFFF', text: '♥',       shape: 'heart'     },
  nostalgic:  { bg: '#E8A000', dot: '#7A5000', accent: '#FFFFFF', text: '...',     shape: 'leaf'      },
  neutral:    { bg: '#8E9BB0', dot: '#3A4A60', accent: '#FFFFFF', text: 'meh.',    shape: 'diamond'   },
};

function drawComicPanel(canvas, mood) {
  const cfg = COMIC_CONFIG[mood] || COMIC_CONFIG.neutral;
  const ctx  = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // --- Background ---
  ctx.fillStyle = cfg.bg;
  ctx.fillRect(0, 0, W, H);

  // --- Halftone dot overlay ---
  const dotR   = 5;
  const dotGap = 18;
  ctx.fillStyle = cfg.dot + '55';
  for (let y = 0; y < H; y += dotGap) {
    for (let x = (Math.floor(y / dotGap) % 2 === 0 ? 0 : dotGap / 2); x < W; x += dotGap) {
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const cx = W / 2, cy = H / 2 - 20;

  // --- Speed lines (radiating from center) for energetic moods ---
  if (['excited', 'angry', 'happy', 'anxious'].includes(mood)) {
    ctx.save();
    ctx.strokeStyle = cfg.dot + '99';
    ctx.lineWidth = 2;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 14) {
      const x1 = cx + Math.cos(a) * 35;
      const y1 = cy + Math.sin(a) * 35;
      const x2 = cx + Math.cos(a) * (W * 0.8);
      const y2 = cy + Math.sin(a) * (H * 0.8);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.restore();
  }

  // --- Main mood shape (large, bold outline) ---
  ctx.fillStyle = cfg.accent;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  const s = 60;

  if (mood === 'happy' || mood === 'excited') {
    // 5-pointed star
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const b = ((i * 4 + 2) * Math.PI) / 5 - Math.PI / 2;
      i === 0 ? ctx.moveTo(cx + s * Math.cos(a), cy + s * Math.sin(a)) : ctx.lineTo(cx + s * Math.cos(a), cy + s * Math.sin(a));
      ctx.lineTo(cx + (s / 2.2) * Math.cos(b), cy + (s / 2.2) * Math.sin(b));
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (mood === 'calm' || mood === 'grateful') {
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.75, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else if (mood === 'sad') {
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.3, s * 0.6, 0, Math.PI * 2);
    ctx.moveTo(cx, cy - s * 0.3 + s * 0.6);
    ctx.quadraticCurveTo(cx + 10, cy + s * 0.7, cx, cy + s);
    ctx.quadraticCurveTo(cx - 10, cy + s * 0.7, cx, cy - s * 0.3 + s * 0.6);
    ctx.fill(); ctx.stroke();
  } else if (mood === 'angry') {
    // Flame shape
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.bezierCurveTo(cx + s * 0.6, cy - s * 0.5, cx + s * 0.5, cy + s * 0.5, cx, cy + s * 0.8);
    ctx.bezierCurveTo(cx - s * 0.5, cy + s * 0.5, cx - s * 0.6, cy - s * 0.5, cx, cy - s);
    ctx.fill(); ctx.stroke();
  } else if (mood === 'anxious') {
    // Spiral
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.1) {
      const r = (a / (Math.PI * 5)) * s;
      const px = cx + r * Math.cos(a);
      const py = cy + r * Math.sin(a);
      a < 0.1 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.lineWidth = 5; ctx.strokeStyle = cfg.accent; ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.stroke();
  } else if (mood === 'reflective' || mood === 'nostalgic') {
    // Crescent moon
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.75, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cfg.bg;
    ctx.beginPath(); ctx.arc(cx + s * 0.3, cy - s * 0.1, s * 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Diamond fallback
    ctx.beginPath();
    ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s * 0.7, cy);
    ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s * 0.7, cy);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  // --- Speech / explosion bubble with text ---
  const bx = W * 0.62, by = H * 0.14;
  const bw = 110, bh = 46, br = 12;

  // Jagged explosion shape for energetic moods
  if (['excited', 'angry', 'happy'].includes(mood)) {
    ctx.fillStyle = '#FFE500';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const pts = 14;
    for (let i = 0; i < pts * 2; i++) {
      const a = (i / (pts * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? bh : bh * 0.62;
      const px = bx + r * Math.cos(a);
      const py = by + r * Math.sin(a);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    // Regular rounded bubble
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, br);
    ctx.fill(); ctx.stroke();
    // Bubble tail
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(bx - 10, by + bh / 2);
    ctx.lineTo(cx + s * 0.4, cy - s * 0.6);
    ctx.lineTo(bx + 10, by + bh / 2);
    ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx - 10, by + bh / 2);
    ctx.lineTo(cx + s * 0.4, cy - s * 0.6);
    ctx.moveTo(bx + 10, by + bh / 2);
    ctx.lineTo(cx + s * 0.4, cy - s * 0.6);
    ctx.stroke();
  }

  // Bubble text
  ctx.fillStyle = '#000';
  ctx.font = `bold ${cfg.text.length > 4 ? 14 : 18}px 'Impact', 'Arial Black', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cfg.text, bx, by);

  // --- Panel border ---
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  // --- Inner shadow lines (top-left corner detail) ---
  ctx.strokeStyle = '#00000033';
  ctx.lineWidth = 2;
  ctx.strokeRect(9, 9, W - 18, H - 18);
}

export default function ImagePanel({ mood, imagePrompt, onImageSaved, savedImagePath }) {
  const canvasRef = useRef(null);
  const fileRef   = useRef(null);
  const [preview, setPreview]   = useState(savedImagePath || null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (savedImagePath) setPreview(savedImagePath);
  }, [savedImagePath]);

  // Auto-draw comic panel on canvas whenever mood changes
  useEffect(() => {
    if (!preview && canvasRef.current) {
      drawComicPanel(canvasRef.current, mood || 'neutral');
    }
  }, [mood, preview]);

  function generateComic() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawComicPanel(canvas, mood || 'neutral');
    canvas.toBlob(async blob => {
      setUploading(true);
      try {
        const res = await uploadImage(blob);
        if (res.path) { setPreview(res.path); onImageSaved(res.path); }
      } finally { setUploading(false); }
    }, 'image/jpeg', 0.92);
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
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
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}
            onClick={() => { setPreview(null); onImageSaved(null); }}>
            Remove
          </button>
        </div>
      ) : (
        <div className={styles.placeholder}>
          <canvas ref={canvasRef} width={420} height={240} className={styles.canvas} />
          <p className={styles.hint}>Comic panel auto-generated from your mood</p>
        </div>
      )}

      <div className={styles.actions}>
        <button className="btn btn-secondary btn-sm" onClick={generateComic} disabled={uploading}>
          {uploading ? <><span className="spinner" /> Saving…</> : '🎨 Save Comic Panel'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
          ↑ Upload Image
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
      </div>
    </div>
  );
}
