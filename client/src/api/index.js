const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const BASE = RAW_API_BASE.replace(/\/$/, '');
const ASSET_ORIGIN = BASE.endsWith('/api') ? BASE.slice(0, -4) : BASE;

function absolutizeUrl(value) {
  if (!value || typeof value !== 'string') return value;
  if (/^https?:\/\//i.test(value) || value.startsWith('blob:') || value.startsWith('data:')) return value;
  if (value.startsWith('/')) return `${ASSET_ORIGIN}${value}`;
  return value;
}

function normalizeApiData(data) {
  if (Array.isArray(data)) return data.map(normalizeApiData);
  if (!data || typeof data !== 'object') return data;

  const normalized = { ...data };
  if ('path' in normalized) normalized.path = absolutizeUrl(normalized.path);
  if ('image_path' in normalized) normalized.image_path = absolutizeUrl(normalized.image_path);
  if ('audio_path' in normalized) normalized.audio_path = absolutizeUrl(normalized.audio_path);
  return normalized;
}

async function req(method, path, body) {
  const opts = { method, headers: {} };
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const error = new Error(err.error || 'Request failed');
    error.status = res.status;
    Object.assign(error, err);
    throw error;
  }
  const data = await res.json();
  return normalizeApiData(data);
}

export const getEntries   = ()           => req('GET',    '/entries');
export const getEntry     = (date)       => req('GET',    `/entries/${date}`);
export const saveEntry    = (data)       => req('POST',   '/entries', data);
export const updateEntry  = (id, data)   => req('PUT',    `/entries/${id}`, data);
export const deleteEntry  = (id)         => req('DELETE', `/entries/${id}`);

export const analyzeEntry = (text, date) => req('POST', '/ai/analyze',    { text, date });
export const companionChat = (message)   => req('POST', '/ai/companion',  { message });
export const getMemories  = ()           => req('GET',  '/ai/memories');

export async function transcribeAudio(blob) {
  const fd = new FormData();
  fd.append('audio', blob, 'recording.webm');
  return req('POST', '/ai/transcribe', fd);
}

export async function uploadAudio(blob) {
  const fd = new FormData();
  fd.append('audio', blob, 'recording.webm');
  return req('POST', '/upload/audio', fd);
}

export async function uploadImage(blob) {
  const fd = new FormData();
  fd.append('image', blob, 'image.jpg');
  return req('POST', '/upload/image', fd);
}

// Weekly mood report
export const getWeeklyReport = (entries, weekLabel) =>
  req('POST', '/ai/weekly-report', { entries, weekLabel });

// Decisions
export const getDecisions      = ()          => req('GET',    '/decisions');
export const getDecision       = (id)        => req('GET',    `/decisions/${id}`);
export const createDecision    = (data)      => req('POST',   '/decisions', data);
export const updateDecision    = (id, data)  => req('PUT',    `/decisions/${id}`, data);
export const deleteDecision    = (id)        => req('DELETE', `/decisions/${id}`);
export const reviewDecision    = (id, data)  => req('POST',   `/decisions/${id}/review`, data);
