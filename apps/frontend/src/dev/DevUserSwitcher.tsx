// ─── DEV ONLY ─ delete this entire file before shipping ──────────────────────
import { useState } from 'react';

const DEV_STORAGE_KEY = 'dev_user_email';

const MOCK_RECRUITERS = [
  { label: 'Alice Park', email: 'alice.park@dev.local' },
  { label: 'Ben Torres', email: 'ben.torres@dev.local' },
  { label: 'Claire Novak', email: 'claire.novak@dev.local' },
  { label: 'David Singh', email: 'david.singh@dev.local' },
  { label: 'Emma Osei', email: 'emma.osei@dev.local' },
  { label: 'Felix Yamamoto', email: 'felix.yamamoto@dev.local' },
  { label: 'Grace Murphy', email: 'grace.murphy@dev.local' },
  { label: 'Henry Kowalski', email: 'henry.kowalski@dev.local' },
  { label: 'Isla Santos', email: 'isla.santos@dev.local' },
  { label: 'James Okonkwo', email: 'james.okonkwo@dev.local' },
];

export function DevUserSwitcher() {
  const [current, setCurrent] = useState(
    localStorage.getItem(DEV_STORAGE_KEY) ?? '',
  );
  const [custom, setCustom] = useState('');

  const switchTo = (email: string) => {
    if (email) {
      localStorage.setItem(DEV_STORAGE_KEY, email);
    } else {
      localStorage.removeItem(DEV_STORAGE_KEY);
    }
    setCurrent(email);
    window.location.reload();
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        background: '#fff',
        border: '2px solid #e53e3e',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        fontFamily: 'monospace',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 220,
      }}
    >
      <div style={{ color: '#e53e3e', fontWeight: 700, marginBottom: 2 }}>
        DEV USER SWITCHER
      </div>
      <div style={{ color: '#666', fontSize: 11 }}>
        {current ? `Acting as: ${current}` : 'No user selected (logged out)'}
      </div>
      <select
        value={current}
        onChange={(e) => switchTo(e.target.value)}
        style={{ fontSize: 12, padding: '2px 4px' }}
      >
        <option value="">— logged out —</option>
        <optgroup label="Mock Recruiters">
          {MOCK_RECRUITERS.map((u) => (
            <option key={u.email} value={u.email}>
              {u.label}
            </option>
          ))}
        </optgroup>
      </select>
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          type="text"
          placeholder="any email (e.g. admin)"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && custom && switchTo(custom)}
          style={{ fontSize: 11, padding: '2px 4px', flex: 1 }}
        />
        <button
          onClick={() => custom && switchTo(custom)}
          style={{ fontSize: 11, padding: '2px 6px' }}
        >
          go
        </button>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
