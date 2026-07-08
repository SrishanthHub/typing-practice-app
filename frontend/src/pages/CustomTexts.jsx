import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function CustomTexts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('browse'); // browse | mine | upload
  const [publicTexts, setPublicTexts] = useState([]);
  const [myTexts, setMyTexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [type, setType] = useState('text');
  const [language, setLanguage] = useState('javascript');
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const pub = await api.getPublicTexts();
      setPublicTexts(pub.texts);
      if (user) {
        const mine = await api.getMyTexts();
        setMyTexts(mine.texts);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    setError('');
    setUploading(true);
    try {
      const res = await api.uploadText({ title, type, language: type === 'code' ? language : null, content, isPublic });
      setTitle(''); setContent('');
      setMyTexts(prev => [res.text, ...prev]);
      if (isPublic && user) {
        setPublicTexts(prev => [{...res.text, username: user.username}, ...prev]);
      }
      setTab('mine');
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this text?')) return;
    await api.deleteText(id);
    load();
  }

  function practice(ct) {
    navigate('/', { state: { customText: ct } });
  }

  return (
    <div>
      <div className="section-title">📄 Custom Texts &amp; Code Snippets</div>
      <div className="mode-bar" style={{ justifyContent: 'flex-start' }}>
        <button className={tab === 'browse' ? 'active' : ''} onClick={() => setTab('browse')}>Browse public</button>
        {user && <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>My texts</button>}
        {user && <button className={tab === 'upload' ? 'active' : ''} onClick={() => setTab('upload')}>+ Upload new</button>}
      </div>

      {error && <p className="auth-error">{error}</p>}

      {tab === 'browse' && (
        <TextList items={publicTexts} loading={loading} onPractice={practice} showAuthor />
      )}

      {tab === 'mine' && user && (
        <TextList items={myTexts} loading={loading} onPractice={practice} onDelete={handleDelete} deletable />
      )}

      {tab === 'upload' && user && (
        <form className="panel" onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="text-title"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <select className="text-type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="text">Plain text / paragraph</option>
              <option value="code">Code snippet</option>
            </select>
            {type === 'code' && (
              <select className="text-type" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="c">C</option>
                <option value="cpp">C++</option>
                <option value="other">Other</option>
              </select>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--sub-color)' }}>
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              Share publicly
            </label>
          </div>
          <textarea
            className="text-input"
            placeholder="Paste your paragraph or code here…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            maxLength={20000}
          />
          <button className="btn" type="submit" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload'}</button>
        </form>
      )}

      {!user && tab !== 'browse' && (
        <p className="empty-state">Log in to upload and manage your own texts.</p>
      )}
    </div>
  );
}

function TextList({ items, loading, onPractice, onDelete, deletable, showAuthor }) {
  if (loading) return <p style={{ color: 'var(--sub-color)' }}>Loading…</p>;
  if (items.length === 0) return <p className="empty-state">Nothing here yet.</p>;
  return (
    <div>
      {items.map((t) => (
        <div className="text-card" key={t.id}>
          <div className="meta">
            {t.type === 'code' ? `💻 ${t.language || 'code'}` : '📝 text'}
            {showAuthor && t.username ? ` · by ${t.username}` : ''}
            {' · '}{new Date(t.created_at + 'Z').toLocaleDateString()}
          </div>
          <strong>{t.title}</strong>
          <div className="content-preview">{t.content}</div>
          <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
            <button className="btn btn-sm" onClick={() => onPractice(t)}>Practice this</button>
            {deletable && <button className="btn btn-sm btn-danger" onClick={() => onDelete(t.id)}>Delete</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
