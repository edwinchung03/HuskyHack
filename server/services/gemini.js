const { GoogleGenerativeAI } = require('@google/generative-ai');

const MOOD_COLORS = {
  positive:  '#c78b5d',
  negative:  '#8e6a4f',
  neutral:   '#9f8b76',
  disturbed: '#6e7f64',
  easy:      '#d8bc97',
};

const MOOD_SHAPES = {
  positive: 'star',
  negative: 'teardrop',
  neutral: 'diamond',
  disturbed: 'spiral',
  easy: 'circle',
};

function normalizeMood(mood = 'neutral') {
  const key = String(mood).toLowerCase();
  return MOOD_COLORS[key] ? key : 'neutral';
}

function requireGeminiKey() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
}

function getGenAI() {
  requireGeminiKey();
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

async function analyzeEntry(text) {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Analyze this diary entry and respond with ONLY a valid JSON object, no markdown fences, no explanation:
{
  "mood": "one of: positive, negative, neutral, disturbed, easy",
  "summary": "2-3 sentence summary of what happened",
  "reflection": "A warm, empathetic 2-3 sentence reflection as a supportive AI companion who knows this person well. Be personal and insightful.",
  "image_prompt": "A vivid, artistic Stable Diffusion prompt that captures the mood and essence of this diary entry. No people, no text. Painterly and evocative."
}

Diary entry:
${text}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini returned invalid JSON');

  const analysis = JSON.parse(jsonMatch[0]);
  const moodKey = normalizeMood(analysis.mood);
  analysis.mood = moodKey;
  analysis.mood_color = MOOD_COLORS[moodKey] || MOOD_COLORS.neutral;
  analysis.mood_shape = MOOD_SHAPES[moodKey] || MOOD_SHAPES.neutral;
  return analysis;
}

async function transcribeAudio(audioBuffer, mimeType = 'audio/webm') {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent([
    { inlineData: { mimeType, data: audioBuffer.toString('base64') } },
    'Transcribe this audio recording exactly as spoken. Return only the transcript text, nothing else.',
  ]);
  return { transcript: result.response.text().trim() };
}

async function chatWithContext(userMessage, memories = []) {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' });

  const memoryBlock = memories.length
    ? `Relevant memories from this person's diary:\n${memories.join('\n')}\n\n`
    : '';

  const prompt = `${memoryBlock}You are a compassionate, insightful AI diary companion. You remember the user's past entries and help them reflect on their journey. Be warm, personal, and concise (2-4 sentences).

User: ${userMessage}`;

  const result = await model.generateContent(prompt);
  return { reply: result.response.text().trim() };
}

async function analyzeDecision(title, assumption, expectedOutcome, context) {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = `You are a sharp advisor analyzing a founder's business assumption. Respond ONLY with valid JSON, no markdown:
{
  "confidence": "high|medium|low",
  "core_bet": "One crisp sentence: what is this person really betting on?",
  "blind_spots": ["up to 3 specific risks or hidden assumptions they may have overlooked"],
  "questions": ["2-3 sharp questions they should answer before fully committing"],
  "mood": "one of: excited, confident, anxious, uncertain, bold, cautious",
  "summary": "One punchy sentence summarizing this decision and its stakes"
}

Title: ${title}
Assumption: ${assumption}
Expected outcome: ${expectedOutcome || 'not specified'}
Context: ${context || 'none'}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini returned invalid JSON');
  return JSON.parse(jsonMatch[0]);
}

async function reflectOnDecision(title, assumption, expectedOutcome, actualOutcome) {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = `You are reflecting on a founder's decision outcome. Respond ONLY with valid JSON, no markdown:
{
  "verdict": "correct|wrong|mixed",
  "accuracy_score": 0-100,
  "what_got_right": "What part of the assumption proved accurate (or null)",
  "what_missed": "The key thing they underestimated or missed (or null)",
  "key_learning": "One powerful sentence they should carry forward",
  "reflection": "2-3 warm, honest sentences as a mentor reflecting on this outcome",
  "memory": "A compact memory to store: decision, assumption, outcome, and key learning in 2 sentences"
}

Title: ${title}
Original assumption: ${assumption}
Expected outcome: ${expectedOutcome || 'not specified'}
Actual outcome: ${actualOutcome}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini returned invalid JSON');
  return JSON.parse(jsonMatch[0]);
}

module.exports = { analyzeEntry, transcribeAudio, chatWithContext, analyzeDecision, reflectOnDecision, MOOD_COLORS, MOOD_SHAPES };
