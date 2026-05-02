// Backboard.io — persistent AI memory across sessions
// Docs: https://backboard.io  |  API key: add BACKBOARD_API_KEY to .env

const BASE_URL = 'https://api.backboard.io';

async function request(method, endpoint, body = null) {
  const key = process.env.BACKBOARD_API_KEY;
  if (!key) return null;

  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, opts);
    if (!res.ok) {
      console.error('Backboard error:', res.status, await res.text());
      return null;
    }
    return res.json();
  } catch (err) {
    console.error('Backboard request failed:', err.message);
    return null;
  }
}

// Store a diary entry summary as a persistent memory
async function storeMemory(date, summary, mood) {
  return request('POST', '/v1/memories', {
    content: `[${date}] Mood: ${mood}. ${summary}`,
    metadata: { date, mood, source: 'husky-diary' },
  });
}

// Retrieve memories relevant to a query (used by AI companion)
async function searchMemories(query, limit = 5) {
  const data = await request('GET', `/v1/memories/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  if (!data) return [];
  return (data.memories || data.results || data.items || []).map(m => m.content || m.text || '');
}

// Get all memories sorted by date (for pattern analysis / timeline)
async function getAllMemories() {
  const data = await request('GET', '/v1/memories?limit=100&sort=date');
  if (!data) return [];
  return data.memories || data.results || data.items || [];
}

// Delete a memory (when diary entry is deleted)
async function deleteMemory(date) {
  const all = await getAllMemories();
  const match = all.find(m => m.metadata?.date === date);
  if (match?.id) await request('DELETE', `/v1/memories/${match.id}`);
}

module.exports = { storeMemory, searchMemories, getAllMemories, deleteMemory };
