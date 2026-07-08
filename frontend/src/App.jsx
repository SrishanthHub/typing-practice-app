import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import CustomTexts from './pages/CustomTexts';
import Achievements from './pages/Achievements';
import DailyChallenge from './pages/DailyChallenge';
import { useAuth } from './context/AuthContext';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p style={{ color: 'var(--sub-color)', textAlign: 'center', marginTop: 60 }}>Loading…</p>;
  if (!user) return <LoggedOutNotice />;
  return children;
}

function LoggedOutNotice() {
  return (
    <div className="empty-state">
      <p>You need to be logged in to view this page.</p>
    </div>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/texts" element={<CustomTexts />} />
          <Route path="/daily-challenge" element={<DailyChallenge />} />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="/achievements"
            element={
              <RequireAuth>
                <Achievements />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="empty-state">
      <h2>404</h2>
      <p>That page doesn't exist.</p>
    </div>
  );
}
