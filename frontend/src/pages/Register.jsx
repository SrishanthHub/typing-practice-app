import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(username, email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Create your account</h1>
      <p style={{ color: 'var(--sub-color)', marginTop: -8 }}>Track stats, earn achievements, build streaks.</p>
      {error && <div className="auth-error">{error}</div>}
      <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} maxLength={20} />
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      <button className="btn" type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Sign up'}</button>
      <div className="auth-switch">Already have an account? <Link to="/login">Log in</Link></div>
    </form>
  );
}
