import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Achievements() {
  const [all, setAll] = useState([]);
  const [earned, setEarned] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [allData, earnedData, progData] = await Promise.all([
          api.getAllAchievements(),
          api.getMyAchievements(),
          api.getAchievementsProgress().catch(() => ({ progress: {} }))
        ]);
        setAll(allData.achievements);
        setEarned(earnedData.earned);
        setProgress(progData.progress || {});
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p style={{ color: 'var(--sub-color)' }}>Loading achievements…</p>;
  if (error) return <p className="auth-error">{error}</p>;

  const earnedMap = new Map(earned.map((e) => [e.key, e]));
  const earnedCount = earned.length;
  const percentage = all.length > 0 ? Math.round((earnedCount / all.length) * 100) : 0;

  return (
    <div>
      <div className="section-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          🏅 Achievements
          <span className="streak-badge">{percentage}% Complete</span>
        </div>
        <div style={{ fontSize: '1rem', color: 'var(--sub-color)' }}>
          {earnedCount} / {all.length} unlocked
        </div>
      </div>

      <div className="grid grid-2">
        {all.map((a) => {
          const isEarned = earnedMap.has(a.key);
          const earnedAt = earnedMap.get(a.key)?.earned_at;
          const p = progress[a.key];
          return (
            <div key={a.key} className={`achievement-card ${isEarned ? 'earned' : ''}`}>
              <span className="icon">{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div className="name">{a.name}</div>
                <div className="desc">{a.description}</div>
                {isEarned && earnedAt ? (
                  <div className="earned-date">
                    Unlocked {new Date(earnedAt + 'Z').toLocaleDateString()}
                  </div>
                ) : p ? (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--sub-color)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Progress</span>
                      <span>{p.current} / {p.target}</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--panel-color)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${(p.current / p.target) * 100}%`, height: '100%', background: 'var(--main-color)', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
