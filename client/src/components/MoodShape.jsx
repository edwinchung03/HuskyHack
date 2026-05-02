export const MOOD_CONFIG = {
  positive:  { color: '#fca311', label: 'Positive' },
  negative:  { color: '#540b0e', label: 'Negative' },
  neutral:   { color: '#e3d5ca', label: 'Neutral' },
  disturbed: { color: '#335c67', label: 'Disturbed' },
  easy:      { color: '#a2d2ff', label: 'Easy' },
};

// neutral
function Circle({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill={color} />
    </svg>
  );
}

// negative
function Teardrop({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 2 C12 2, 4 10, 4 15 a8 8 0 0 0 16 0 C20 10, 12 2, 12 2Z" fill={color} />
    </svg>
  );
}

// disturbed
function Spiral({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 12 m0,-6 a6,6 0 1,1 -0.1,0 M12 12 m0,-3 a3,3 0 1,0 0.1,0" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="2" fill={color} />
    </svg>
  );
}
// easy
function Moon({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={color} />
    </svg>
  );
}

// positive
function Heart({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill={color} />
    </svg>
  );
}

const SHAPE_COMPONENTS = {
  positive: Heart,
  negative: Teardrop,
  neutral: Circle,
  disturbed: Spiral,
  easy: Moon,
};

export function normalizeMood(mood = 'neutral') {
  const key = String(mood).toLowerCase();
  return MOOD_CONFIG[key] ? key : 'neutral';
}

export default function MoodShape({ mood = 'neutral', size = 22, glow = false }) {
  const normalizedMood = normalizeMood(mood);
  const cfg = MOOD_CONFIG[normalizedMood] || MOOD_CONFIG.neutral;
  const ShapeComp = SHAPE_COMPONENTS[normalizedMood] || Circle;

  return (
    <span
      title={`Mood: ${cfg.label}`}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        filter: glow ? `drop-shadow(0 0 6px ${cfg.color}99)` : undefined,
      }}
    >
      <ShapeComp color={cfg.color} size={size} />
    </span>
  );
}
