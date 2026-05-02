const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/', (req, res) => {
  const db = getDb();
  const entries = db.prepare(
    'SELECT id, date, title, mood_label, mood_color, mood_shape, ai_summary FROM entries ORDER BY date DESC'
  ).all();
  res.json(entries);
});

router.get('/:date', (req, res) => {
  const db = getDb();
  const entry = db.prepare('SELECT * FROM entries WHERE date = ?').get(req.params.date);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  res.json(entry);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { date, title, body, audio_path, image_path, mood_label, mood_color, mood_shape, ai_summary, ai_reflection, image_prompt } = req.body;

  try {
    const result = db.prepare(`
      INSERT INTO entries (date, title, body, audio_path, image_path, mood_label, mood_color, mood_shape, ai_summary, ai_reflection, image_prompt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(date, title || '', body || '', audio_path || null, image_path || null,
           mood_label || 'neutral', mood_color || '#6C757D', mood_shape || 'diamond',
           ai_summary || null, ai_reflection || null, image_prompt || null);

    const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(entry);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      db.prepare(`
        UPDATE entries SET title=?, body=?, audio_path=?, image_path=?, mood_label=?, mood_color=?,
        mood_shape=?, ai_summary=?, ai_reflection=?, image_prompt=?, updated_at=CURRENT_TIMESTAMP
        WHERE date=?
      `).run(title || '', body || '', audio_path || null, image_path || null,
             mood_label || 'neutral', mood_color || '#6C757D', mood_shape || 'diamond',
             ai_summary || null, ai_reflection || null, image_prompt || null, date);
      res.json(db.prepare('SELECT * FROM entries WHERE date = ?').get(date));
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { title, body, audio_path, image_path, mood_label, mood_color, mood_shape, ai_summary, ai_reflection, image_prompt } = req.body;
  db.prepare(`
    UPDATE entries SET title=?, body=?, audio_path=?, image_path=?, mood_label=?, mood_color=?,
    mood_shape=?, ai_summary=?, ai_reflection=?, image_prompt=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(title, body, audio_path, image_path, mood_label, mood_color, mood_shape, ai_summary, ai_reflection, image_prompt, req.params.id);
  res.json(db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM entries WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});


//delete upload
router.patch('/:id/clear', (req, res) => {
  const db = getDb();
  const { field } = req.body; // e.g. "image_path", "audio_path", "body", "title"
  const allowed = ['image_path', 'audio_path', 'body', 'title', 'ai_summary', 'ai_reflection'];
  if (!allowed.includes(field)) return res.status(400).json({ error: 'Invalid field' });
  db.prepare(`UPDATE entries SET ${field} = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(req.params.id);
  res.json(db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id));
});

module.exports = router;
