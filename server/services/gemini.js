const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL = 'gemini-2.5-flash';

const MOOD_COLORS = {
  positive: '#c78b5d',
  negative: '#8e6a4f',
  neutral: '#9f8b76',
  disturbed: '#6e7f64',
  easy: '#d8bc97',
};

const MOOD_SHAPES = {
  positive: 'heart',
  negative: 'teardrop',
  neutral: 'circle',
  disturbed: 'spiral',
  easy: 'moon',
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
  const model = getGenAI().getGenerativeModel({ model: MODEL });

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
  const model = getGenAI().getGenerativeModel({ model: MODEL });
  const result = await model.generateContent([
    { inlineData: { mimeType, data: audioBuffer.toString('base64') } },
    'Transcribe this audio recording exactly as spoken. Return only the transcript text, nothing else.',
  ]);
  return { transcript: result.response.text().trim() };
}

async function chatWithContext(userMessage, memories = []) {
  const model = getGenAI().getGenerativeModel({ model: MODEL });

  const memoryBlock = memories.length
    ? `Relevant memories from this person's diary:\n${memories.join('\n')}\n\n`
    : '';

  const prompt = `${memoryBlock}You are a compassionate, insightful AI diary companion. You remember the user's past entries and help them reflect on their journey. Be warm, personal, and concise (2-4 sentences).

User: ${userMessage}`;

  const result = await model.generateContent(prompt);
  return { reply: result.response.text().trim() };
}

async function analyzeDecision(title, assumption, expectedOutcome, context) {
  const model = getGenAI().getGenerativeModel({ model: MODEL });
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
  const model = getGenAI().getGenerativeModel({ model: MODEL });
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

async function generateWeeklyReport(entries, weekLabel) {
  requireGeminiKey();
  if (!entries.length) {
    return `WEEKLY MOOD ANALYSIS REPORT\nPeriod: ${weekLabel}\n\nNo diary entries found for this week.`;
  }

  const model = getGenAI().getGenerativeModel({ model: MODEL });
  const moodCounts = {};
  entries.forEach(entry => {
    const mood = normalizeMood(entry.mood_label || 'neutral');
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;
  });
  const moodDist = Object.entries(moodCounts).map(([mood, count]) => `${mood}: ${count} day(s)`).join(', ');

  const entryLines = entries.map(entry => {
    const mood = normalizeMood(entry.mood_label || 'neutral');
    const summary = entry.ai_summary || String(entry.body || '').replace(/<[^>]+>/g, ' ').slice(0, 120) || 'No content';
    return `- ${entry.date} [${mood}]: "${entry.title || 'Untitled'}" — ${summary}`;
  }).join('\n');

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const prompt = `You are a clinical mental health AI assistant generating a structured weekly mood report from personal diary entries. This report may be shared with a healthcare provider or therapist.

Week: ${weekLabel}
Report generated: ${today}
Total diary entries this week: ${entries.length}
Mood distribution: ${moodDist}

Daily entries:
${entryLines}

Write a professional, factual report using EXACTLY this plain-text format (no markdown, no bullet symbols, use dashes where needed):

WEEKLY MOOD ANALYSIS REPORT
Period: ${weekLabel}
Generated: ${today}
Entries analyzed: ${entries.length}
────────────────────────────────────

1. WEEKLY OVERVIEW
[2-3 sentences describing the overall emotional tone and key themes of the week]

2. MOOD DISTRIBUTION
[Each mood that appeared, how many days, and brief context about when it occurred]

3. EMOTIONAL PATTERNS OBSERVED
[2-3 specific patterns or transitions noted — e.g. mood shifts, recurring themes, triggers]

4. POSITIVE HIGHLIGHTS
[Notable positive moments, resilience, or strengths demonstrated this week]

5. AREAS REQUIRING ATTENTION
[Concerning patterns, persistent low moods, or stress indicators. If none: "No significant concerns identified this week."]

6. SUGGESTED DISCUSSION POINTS FOR HEALTHCARE PROVIDER
[3-5 specific, professionally framed talking points a therapist or doctor might explore]

────────────────────────────────────
DISCLAIMER: This report is generated by AI from personal diary entries and does not constitute a medical or psychiatric assessment. It is intended as supplemental context for healthcare conversations only. Always consult a qualified professional for mental health concerns.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

module.exports = {
  analyzeEntry,
  transcribeAudio,
  chatWithContext,
  analyzeDecision,
  reflectOnDecision,
  generateWeeklyReport,
  MOOD_COLORS,
  MOOD_SHAPES,
};
