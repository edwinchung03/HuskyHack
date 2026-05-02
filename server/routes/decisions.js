const express = require('express');
const router  = express.Router();
const { getDb } = require('../db/database');
const { analyzeDecision, reflectOnDecision } = require('../services/gemini');
const { storeMemory } = require('../services/backboard');

// List all decisions (newest first)
router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM decisions ORDER BY created_at DESC').all());
});

// Get one
router.get('/:id', (req, res) => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM decisions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// Create + auto-analyze
router.post('/', async (req, res) => {
  const db = getDb();
  const { title, assumption, expected_outcome, context, follow_up_date } = req.body;
  if (!title?.trim() || !assumption?.trim())
    return res.status(400).json({ error: 'title and assumption are required' });

  let ai = {};
  try {
    ai = await analyzeDecision(title, assumption, expected_outcome, context);
  } catch (err) {
    console.error('Decision analyze error:', err.message);
  }

  const result = db.prepare(`
    INSERT INTO decisions (title, assumption, expected_outcome, context, follow_up_date,
      confidence, core_bet, blind_spots, ai_questions, ai_analysis, mood_label)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, assumption, expected_outcome || null, context || null, follow_up_date || null,
    ai.confidence || 'medium',
    ai.core_bet   || null,
    ai.blind_spots ? JSON.stringify(ai.blind_spots) : null,
    ai.questions   ? JSON.stringify(ai.questions)   : null,
    ai.summary     || null,
    ai.mood        || 'confident',
  );

  res.status(201).json(db.prepare('SELECT * FROM decisions WHERE id = ?').get(result.lastInsertRowid));
});

// Update (edit fields)
router.put('/:id', (req, res) => {
  const db = getDb();
  const { title, assumption, expected_outcome, context, follow_up_date } = req.body;
  db.prepare(`
    UPDATE decisions SET title=?, assumption=?, expected_outcome=?, context=?, follow_up_date=?,
    updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(title, assumption, expected_outcome, context, follow_up_date, req.params.id);
  res.json(db.prepare('SELECT * FROM decisions WHERE id = ?').get(req.params.id));
});

// Record outcome + reflect
router.post('/:id/review', async (req, res) => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM decisions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const { actual_outcome } = req.body;
  if (!actual_outcome?.trim()) return res.status(400).json({ error: 'actual_outcome required' });

  let reflection = {};
  try {
    reflection = await reflectOnDecision(row.title, row.assumption, row.expected_outcome, actual_outcome);
  } catch (err) {
    console.error('Decision reflect error:', err.message);
  }

  db.prepare(`
    UPDATE decisions SET actual_outcome=?, status=?, ai_reflection=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(
    actual_outcome,
    reflection.verdict || 'mixed',
    reflection.reflection || null,
    req.params.id,
  );

  // Persist this learning in Backboard so the AI companion remembers it
  if (process.env.BACKBOARD_API_KEY && reflection.memory) {
    storeMemory(`decision:${req.params.id}`, reflection.memory, reflection.verdict).catch(() => {});
  }

  res.json({
    decision: db.prepare('SELECT * FROM decisions WHERE id = ?').get(req.params.id),
    reflection,
  });
});

// Delete
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM decisions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
