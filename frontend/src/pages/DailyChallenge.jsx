import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { compareWord, mergeErrorMaps } from '../utils/compare';
import { computeConsistency, computeWpm } from '../utils/textGen';

export default function DailyChallenge() {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState(null);
  const [alreadyDone, setAlreadyDone] = useState(null); // result row or null
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [streakData, setStreakData] = useState(null);

  useEffect(() => {
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [challengeData, lbData] = await Promise.all([
        api.getDailyChallenge(),
        api.getDailyLeaderboard()
      ]);
      setChallenge(challengeData.challenge);
      setLeaderboard(lbData.leaderboard);

      if (user) {
        const mine = await api.getMyDailyStatus();
        setAlreadyDone(mine.completed ? mine.result : null);
        try {
          const stats = await api.getStats();
          setStreakData(stats.streak);
        } catch (e) {}
      } else {
        setAlreadyDone(null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = tomorrow - now;
      const h = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
      const m = String(Math.floor((diff / 1000 / 60) % 60)).padStart(2, '0');
      const s = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
      setTimeLeft(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <p style={{ color: 'var(--sub-color)' }}>Loading today's challenge…</p>;
  if (error) return <p className="auth-error">{error}</p>;

  return (
    <div>
      <div className="section-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          🗓️ Daily Challenge
          <span className="streak-badge">{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div style={{ fontSize: '1rem', color: 'var(--main-color)', fontWeight: 600 }}>
          Next in: {timeLeft}
        </div>
      </div>

      <div className="panel" style={{ textAlign: 'center', color: 'var(--sub-color)', marginBottom: 20 }}>
        Everyone gets the same <strong>{challenge.content_type === 'code' ? 'code snippet' : challenge.mode === 'quote' ? 'quote' : 'words'}</strong> today. One attempt — make it count.
        <div style={{ marginTop: 10 }}>
          <span className="mode-btn active" style={{ cursor: 'default' }}>
            {challenge.content_type === 'code' ? '👨‍💻 Code' : challenge.mode === 'quote' ? '💬 Quote' : '📝 Words'}
          </span>
          {streakData && streakData.current_streak > 0 && (
            <span className="streak-badge" style={{ marginLeft: 10 }}>🔥 {streakData.current_streak} Day Streak</span>
          )}
        </div>
      </div>

      {!user && (
        <p className="empty-state">Log in to submit your result and appear on today's leaderboard. You can still practice below.</p>
      )}

      {alreadyDone ? (
        <div className="panel result-panel">
          <p style={{ color: 'var(--main-color)', fontWeight: 700 }}>You already completed today's challenge!</p>
          <div className="result-grid">
            <div>
              <div className="big">{alreadyDone.wpm}</div>
              <div className="lbl">wpm</div>
            </div>
            <div>
              <div className="big">{alreadyDone.accuracy}%</div>
              <div className="lbl">accuracy</div>
            </div>
          </div>
          <p style={{ color: 'var(--sub-color)' }}>Come back tomorrow for a new challenge.</p>
        </div>
      ) : (
        <DailyTypingWidget
          challenge={challenge}
          loggedIn={!!user}
          onSubmitted={(result) => {
            setAlreadyDone(result);
            load();
          }}
        />
      )}

      <div className="panel">
        <div className="section-title">🏆 Today's Leaderboard</div>
        {leaderboard.length === 0 ? (
          <p className="empty-state">No one has completed today's challenge yet. Be the first!</p>
        ) : (
          <table className="leaderboard">
            <thead>
              <tr><th>#</th><th>User</th><th>WPM</th><th>Accuracy</th><th>Completed</th></tr>
            </thead>
            <tbody>
              {leaderboard.map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{r.username}</td>
                  <td>{r.wpm}</td>
                  <td>{r.accuracy}%</td>
                  <td>{new Date(r.completed_at + 'Z').toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function DailyTypingWidget({ challenge, loggedIn, onSubmitted }) {
  const targetWords = useRef(challenge.content.split(/\s+/).filter(Boolean)).current;

  const [wordIndex, setWordIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [typedWords, setTypedWords] = useState([]);
  const [status, setStatus] = useState('idle');
  const [focused, setFocused] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAcc, setLiveAcc] = useState(100);

  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);
  const containerRef = useRef(null);
  const statsAccRef = useRef({ correct: 0, incorrect: 0, extra: 0, missed: 0, errorMap: {} });

  const finish = useCallback((finalStats, elapsed) => {
    clearInterval(intervalRef.current);
    const totalTyped = finalStats.correct + finalStats.incorrect;
    const accuracy = totalTyped > 0 ? Math.round((finalStats.correct / totalTyped) * 1000) / 10 : 100;
    const wpm = computeWpm(finalStats.correct, elapsed);
    const rawWpm = computeWpm(totalTyped + finalStats.extra, elapsed);

    const finalResult = { wpm, rawWpm, accuracy, durationSeconds: Math.round(elapsed / 1000) };
    setResult(finalResult);
    setStatus('finished');

    if (loggedIn) {
      api.submitDailyChallenge({ wpm, accuracy })
        .then(() => onSubmitted(finalResult))
        .catch((e) => setSubmitError(e.message));
    }
  }, [loggedIn, onSubmitted]);

  function startIfNeeded() {
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
      setStatus('running');
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const acc = statsAccRef.current;
        const total = acc.correct + acc.incorrect;
        setLiveWpm(computeWpm(acc.correct, elapsed));
        setLiveAcc(total > 0 ? Math.round((acc.correct / total) * 100) : 100);
      }, 1000);
    }
  }

  function handleKeyDown(e) {
    if (status === 'finished') return;
    const isLastWord = wordIndex === targetWords.length - 1;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentInput.length > 0) {
        setCurrentInput((s) => s.slice(0, -1));
      }
      return;
    }

    if (e.key === ' ') {
      e.preventDefault();
      if (currentInput.length === 0) return;
      startIfNeeded();
      const target = targetWords[wordIndex] || '';
      const cmp = compareWord(target, currentInput);
      statsAccRef.current = {
        correct: statsAccRef.current.correct + cmp.correct + (isLastWord ? 0 : 1),
        incorrect: statsAccRef.current.incorrect + cmp.incorrect,
        extra: statsAccRef.current.extra + cmp.extra,
        missed: statsAccRef.current.missed + cmp.missed,
        errorMap: mergeErrorMaps(statsAccRef.current.errorMap, cmp.errorMap)
      };
      setTypedWords((prev) => [...prev, { target, typed: currentInput }]);
      setCurrentInput('');

      if (isLastWord) {
        finish(statsAccRef.current, Date.now() - startTimeRef.current);
      } else {
        setWordIndex((i) => i + 1);
      }
      return;
    }

    if (e.key.length === 1) {
      e.preventDefault();
      startIfNeeded();
      const target = targetWords[wordIndex] || '';
      const nextInput = currentInput + e.key;
      setCurrentInput(nextInput);

      if (isLastWord && nextInput.length >= target.length) {
        setTimeout(() => {
          const cmp = compareWord(target, nextInput);
          statsAccRef.current = {
            correct: statsAccRef.current.correct + cmp.correct,
            incorrect: statsAccRef.current.incorrect + cmp.incorrect,
            extra: statsAccRef.current.extra + cmp.extra,
            missed: statsAccRef.current.missed + cmp.missed,
            errorMap: mergeErrorMaps(statsAccRef.current.errorMap, cmp.errorMap)
          };
          setTypedWords((prev) => [...prev, { target, typed: nextInput }]);
          finish(statsAccRef.current, Date.now() - startTimeRef.current);
        }, 0);
      }
    }
  }

  if (status === 'finished' && result) {
    return (
      <div className="panel result-panel">
        <div className="result-grid">
          <div><div className="big">{result.wpm}</div><div className="lbl">wpm</div></div>
          <div><div className="big">{result.accuracy}%</div><div className="lbl">accuracy</div></div>
          <div><div className="big">{result.durationSeconds}s</div><div className="lbl">time</div></div>
        </div>
        {!loggedIn && <p style={{ color: 'var(--sub-color)' }}>Log in next time to save this to the leaderboard.</p>}
        {submitError && <p className="auth-error">{submitError}</p>}
      </div>
    );
  }

  return (
    <>
      <div className="live-stats">
        <div>{liveWpm} wpm</div>
        <div style={{ color: 'var(--sub-color)' }}>{liveAcc}%</div>
      </div>
      <div
        ref={containerRef}
        className={`typing-area ${focused ? '' : 'blurred'}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={challenge.content_type === 'code' ? { textAlign: 'left', whiteSpace: 'pre-wrap', maxWidth: 800 } : undefined}
      >
        {renderWords(targetWords, typedWords, wordIndex, currentInput)}
      </div>
      {!focused && <div className="click-to-focus">click here or start typing to focus</div>}
    </>
  );
}

function renderWords(targetWords, typedWords, wordIndex, currentInput) {
  const nodes = [];
  for (let w = 0; w < targetWords.length; w++) {
    const target = targetWords[w];
    let typed = '';
    if (w < wordIndex) typed = typedWords[w]?.typed ?? '';
    else if (w === wordIndex) typed = currentInput;

    const chars = [];
    const maxLen = Math.max(target.length, typed.length);
    for (let i = 0; i < maxLen; i++) {
      const t = target[i];
      const u = typed[i];
      let cls = 'pending';
      if (t === undefined) cls = 'extra';
      else if (u === undefined) cls = 'pending';
      else if (u === t) cls = 'correct';
      else cls = 'incorrect';

      const isCurrent = w === wordIndex && i === typed.length;
      chars.push(
        <span key={i} className={`char ${cls} ${isCurrent ? 'current' : ''}`}>
          {t !== undefined ? t : u}
        </span>
      );
    }
    if (w === wordIndex && typed.length === target.length) {
      chars.push(<span key="caret-end" className="char pending current"> </span>);
    }
    nodes.push(
      <span key={w} className="word" style={{ marginRight: '0.6ch', display: 'inline-block' }}>
        {chars}
      </span>
    );
  }
  return nodes;
}
