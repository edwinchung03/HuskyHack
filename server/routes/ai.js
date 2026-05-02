const express = require('express');
const router = express.Router();
const multer = require('multer');
const { analyzeEntry, transcribeAudio, chatWithContext } = require('../services/gemini');
const { storeMemory, searchMemories, getAllMemories } = require('../services/backboard');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// Analyze diary text → mood, summary, reflection, image prompt
router.post('/analyze', async (req, res) => {
  try {
    const { text, date } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Text is required' });

    const analysis = await analyzeEntry(text);

    // Push to Backboard memory (fire-and-forget — don't block the response)
    if (process.env.BACKBOARD_API_KEY && analysis.summary) {
      storeMemory(date, analysis.summary, analysis.mood).catch(() => {});
    }

    res.json(analysis);
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Transcribe uploaded audio → text
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Audio file required' });
    const result = await transcribeAudio(req.file.buffer, req.file.mimetype || 'audio/webm');
    res.json(result);
  } catch (err) {
    console.error('Transcribe error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Companion chat — pulls Backboard memories for context
router.post('/companion', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

    // Retrieve relevant memories from Backboard to give the AI context
    const memories = await searchMemories(message);

    const response = await chatWithContext(message, memories);
    res.json(response);
  } catch (err) {
    console.error('Companion error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fetch all memories for pattern / timeline view
router.get('/memories', async (req, res) => {
  try {
    const memories = await getAllMemories();
    res.json({ memories, enabled: !!process.env.BACKBOARD_API_KEY });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
