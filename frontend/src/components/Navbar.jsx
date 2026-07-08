import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { THEMES, applyTheme } from '../themes';
import { API_BASE } from '../api/client';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('keyflow_theme') || 'serika_dark');

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('keyflow_theme', theme);
  }, [theme]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="navbar">
      <NavLink to="/" className="brand">⌨ KeyFlow</NavLink>
      <nav>
        <NavLink to="/" end>Type</NavLink>
        <NavLink to="/daily-challenge">Daily</NavLink>
        <NavLink to="/leaderboard">Leaderboard</NavLink>
        <NavLink to="/texts">Custom Texts</NavLink>
        {user && <NavLink to="/profile">Profile</NavLink>}
        {user && <NavLink to="/achievements">Achievements</NavLink>}

        <select
          className="theme-select"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          title="Theme"
        >
          {Object.entries(THEMES).map(([key, t]) => (
            <option key={key} value={key}>{t.label}</option>
          ))}
        </select>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user.avatar_url ? (
              <img src={`${API_BASE}${user.avatar_url}`} alt="avatar" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--main-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-color)', fontWeight: 'bold', fontSize: 12 }}>
                {user.username[0].toUpperCase()}
              </div>
            )}
            <span style={{ color: 'var(--sub-color)' }}>{user.username}</span>
            <button onClick={handleLogout}>Log out</button>
          </div>
        ) : (
          <>
            <NavLink to="/login">Log in</NavLink>
            <NavLink to="/register">Sign up</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
