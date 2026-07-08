import { useEffect, useState, useRef } from 'react';
import { api, API_BASE } from '../api/client';
import WpmChart from '../components/WpmChart';
import Heatmap from '../components/Heatmap';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, updateProfile, updateAvatar } = useAuth();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setEditUsername(user.username);
      setEditBio(user.bio || '');
    }
  }, [user]);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, historyData] = await Promise.all([api.getStats(), api.getHistory(20)]);
        setStats(statsData);
        setHistory(historyData.results);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p style={{ color: 'var(--sub-color)' }}>Loading profile…</p>;
  if (error) return <p className="auth-error">{error}</p>;

  async function handleSaveProfile() {
    try {
      await updateProfile({ username: editUsername, bio: editBio });
      setIsEditing(false);
    } catch (e) {
      alert(e.message || 'Failed to save profile');
    }
  }

  async function handleFileChange(e) {
    if (!e.target.files[0]) return;
    try {
      await updateAvatar(e.target.files[0]);
    } catch (e) {
      alert(e.message || 'Failed to upload avatar');
    }
  }

  return (
    <div>
      <div className="panel profile-header" style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          {user?.avatar_url ? (
            <img src={`${API_BASE}${user.avatar_url}`} alt="avatar" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 100, height: 100, borderRadius: '50%', backgroundColor: 'var(--main-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-color)', fontSize: 40, fontWeight: 'bold' }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
          )}
          <button 
            className="btn btn-sm" 
            style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
            onClick={() => fileInputRef.current?.click()}
          >
            Change
          </button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
        </div>
        
        <div style={{ flex: 1 }}>
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={editUsername} onChange={e => setEditUsername(e.target.value)} className="text-input" placeholder="Username" />
              <textarea value={editBio} onChange={e => setEditBio(e.target.value)} className="text-input" placeholder="Bio..." rows={3} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" onClick={handleSaveProfile}>Save</button>
                <button className="btn" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: '0 0 10px 0' }}>{user?.username}</h2>
                <button className="btn btn-sm" onClick={() => setIsEditing(true)}>Edit Profile</button>
              </div>
              <p style={{ color: 'var(--sub-color)', margin: 0, whiteSpace: 'pre-wrap' }}>{user?.bio || 'No bio yet.'}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--sub-color)', marginTop: 10 }}>Member since {user?.created_at ? new Date(user.created_at + 'Z').toLocaleDateString() : 'recently'}</p>
            </div>
          )}
        </div>
      </div>

      <div className="section-title">
        📊 Your Stats
        {stats.streak.current_streak > 0 && (
          <span className="streak-badge">🔥 {stats.streak.current_streak} day streak</span>
        )}
      </div>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-box"><div className="value">{stats.totalTests}</div><div className="label">Tests taken</div></div>
        <div className="stat-box"><div className="value">{stats.bestWpm}</div><div className="label">Best WPM</div></div>
        <div className="stat-box"><div className="value">{stats.avgWpm}</div><div className="label">Avg WPM</div></div>
        <div className="stat-box"><div className="value">{stats.avgAccuracy}%</div><div className="label">Avg Accuracy</div></div>
        <div className="stat-box"><div className="value">{stats.streak.longest_streak}</div><div className="label">Longest Streak</div></div>
      </div>

      <div className="panel">
        <div className="section-title">📈 Progress Over Time</div>
        <WpmChart data={stats.wpmOverTime} />
      </div>

      <div className="panel">
        <div className="section-title">⌨️ Mistake Heatmap</div>
        <Heatmap errorMap={stats.charErrorHeatmap} />
      </div>

      <div className="panel">
        <div className="section-title">🕓 Recent Tests</div>
        {history.length === 0 ? (
          <p className="empty-state">No tests yet — go type something!</p>
        ) : (
          <table className="leaderboard">
            <thead>
              <tr><th>Mode</th><th>WPM</th><th>Accuracy</th><th>Consistency</th><th>Date</th></tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{h.mode}{h.mode_value ? ` (${h.mode_value})` : ''}</td>
                  <td>{h.wpm}</td>
                  <td>{h.accuracy}%</td>
                  <td>{h.consistency}%</td>
                  <td>{new Date(h.created_at + 'Z').toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
