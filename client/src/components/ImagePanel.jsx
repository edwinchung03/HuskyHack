import { useRef, useState, useEffect } from 'react';
import { assetUrl, uploadImage } from '../api';
import styles from './ImagePanel.module.css';
export default function ImagePanel({ onImageSaved, savedImagePath }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(assetUrl(savedImagePath) || null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (savedImagePath) setPreview(assetUrl(savedImagePath));
  }, [savedImagePath]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setUploading(true);
    try {
      const res = await uploadImage(file);
      if (res.path) {
        setPreview(assetUrl(res.path));
        onImageSaved(res.path);
      }
    } finally {
      setUploading(false);
    }
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
          <p className={styles.emptyTitle}>No photo added yet</p>
          <p className={styles.hint}>Upload one photo for this diary entry.</p>
        </div>
      )}

      <div className={styles.actions}>
        {!preview && (
          <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <><span className="spinner" /> Saving…</> : '↑ Upload Photo'}
          </button>
        )}
        {preview && (
          <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          ↑ Upload Photo
        </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
      </div>
    </div>
  );
}
