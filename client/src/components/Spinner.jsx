import React from 'react';

export default function Spinner({ size = 16, label = '' }) {
  const s = typeof size === 'number' ? size : 16;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <svg width={s} height={s} viewBox="0 0 50 50" style={{ animation: 'spin 1s linear infinite' }}>
        <circle cx="25" cy="25" r="20" stroke="#6b7280" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="31.4 31.4" />
      </svg>
      {label}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </span>
  );
}
