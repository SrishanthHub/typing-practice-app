import { useEffect, useState } from 'react';
import { api } from '../api/client';

const MODES = [
  { mode: 'time', modeValue: '15', label: 'Time 15s' },
  { mode: 'time', modeValue: '30', label: 'Time 30s' },
  { mode: 'time', modeValue: '60', label: 'Time 60s' },
  { mode: 'words', modeValue: '25', label: 'Words 25' },
  { mode: 'words', modeValue: '50', label: 'Words 50' },
  { mode: 'quote', modeValue: null, label: 'Quotes' }
];

export default function Leaderboard() {
  const [selected, setSelected] = useState(MODES[1]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getLeaderboard(selected.mode, selected.modeValue)
      .then((data) => setRows(data.leaderboard))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <div>
      <div className="section-title">🏆 Leaderboard</div>
      <div className="mode-bar" style={{ justifyContent: 'flex-start' }}>
        {MODES.map((m) => (
          <button
            key={m.label}
            className={selected.label === m.label ? 'active' : ''}
            onClick={() => setSelected(m)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="panel">
        {loading ? (
          <p style={{ color: 'var(--sub-color)' }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p className="empty-state">No results yet for this mode. Be the first!</p>
        ) : (
          <table className="leaderboard">
            <thead>
              <tr><th>#</th><th>User</th><th>WPM</th><th>Accuracy</th><th>Date</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{r.username}</td>
                  <td>{r.wpm}</td>
                  <td>{r.accuracy}%</td>
                  <td>{new Date(r.created_at + 'Z').toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
