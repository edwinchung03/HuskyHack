import { useState, useRef, useEffect } from 'react';
import { companionChat } from '../api';
import styles from './AICompanion.module.css';

export default function AICompanion() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hi! I'm your AI diary companion. I remember your past entries and I'm here to help you reflect. What's on your mind?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await companionChat(msg);
      setMessages(m => [...m, { role: 'ai', text: res.reply || 'Sorry, I had trouble responding.' }]);
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Something went wrong. Check that your API keys are set in .env.' }]);
    }
    setLoading(false);
  }

  function onKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }

  return (
    <>
      {/* Toggle button */}
      <button className={styles.toggle} onClick={() => setOpen(o => !o)} title="AI Companion">
        <span className={styles.toggleIcon}>{open ? '×' : '✦'}</span>
        {!open && <span className={styles.togglePulse} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className={`${styles.panel} fade-up`}>
          <div className={styles.header}>
            <div>
              <p className={styles.headerTitle}>AI Companion</p>
              <p className={styles.headerSub}>Remembers your entire diary journey</p>
            </div>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className={styles.messages}>
            {messages.map((m, i) => (
              <div key={i} className={`${styles.message} ${m.role === 'user' ? styles.user : styles.ai}`}>
                {m.role === 'ai' && <span className={styles.aiAvatar}>✦</span>}
                <p>{m.text}</p>
              </div>
            ))}
            {loading && (
              <div className={`${styles.message} ${styles.ai}`}>
                <span className={styles.aiAvatar}>✦</span>
                <p className={styles.typing}><span /><span /><span /></p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className={styles.inputRow}>
            <textarea
              rows={2}
              placeholder="Ask your diary companion…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              className={styles.input}
            />
            <button className="btn btn-primary btn-icon" onClick={send} disabled={!input.trim() || loading}>
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}
