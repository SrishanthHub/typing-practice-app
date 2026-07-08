import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { decorateWords, computeConsistency, computeWpm } from '../utils/textGen';
import { compareWord, mergeErrorMaps } from '../utils/compare';

const TIME_OPTIONS = [15, 30, 60, 120];
const WORD_OPTIONS = [10, 25, 50, 100];

export default function TypingTest() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mode, setMode] = useState('time');
  const [modeValue, setModeValue] = useState(30);
  const [punctuation, setPunctuation] = useState(false);
  const [numbers, setNumbers] = useState(false);

  const [targetWords, setTargetWords] = useState([]);
  const [codeLanguage, setCodeLanguage] = useState(null);
  const [customMeta, setCustomMeta] = useState(null); // {id, title} for custom texts
  const [loadingText, setLoadingText] = useState(false);

  const [wordIndex, setWordIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [typedWords, setTypedWords] = useState([]); // finalized {target, typed}
  const [status, setStatus] = useState('idle'); // idle | running | finished
  const [timeLeft, setTimeLeft] = useState(modeValue);
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAcc, setLiveAcc] = useState(100);
  const [focused, setFocused] = useState(false);
  const [result, setResult] = useState(null);
  const [newAchievements, setNewAchievements] = useState([]);
  const [submitError, setSubmitError] = useState('');

  const startTimeRef = useRef(null);
  const wpmSamplesRef = useRef([]);
  const intervalRef = useRef(null);
  const containerRef = useRef(null);
  const statsAccRef = useRef({ correct: 0, incorrect: 0, extra: 0, missed: 0, errorMap: {} });

  // Load custom text pushed via navigation state (from the Custom Texts page)
  useEffect(() => {
    if (location.state?.customText) {
      const ct = location.state.customText;
      applyCustomText(ct);
      // clear the state so refresh doesn't reapply
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const loadContent = useCallback(async () => {
    setLoadingText(true);
    setCustomMeta(null);
    setCodeLanguage(null);
    try {
      if (mode === 'time') {
        const data = await api.getWords(120);
        setTargetWords(decorateWords(data.content.split(' '), { punctuation, numbers }));
      } else if (mode === 'words') {
        const data = await api.getWords(modeValue);
        setTargetWords(decorateWords(data.content.split(' '), { punctuation, numbers }));
      } else if (mode === 'quote') {
        const data = await api.getQuote();
        setTargetWords(data.content.split(' '));
      } else if (mode === 'code') {
        const data = await api.getCode();
        setCodeLanguage(data.language);
        setTargetWords(data.content.split(/\s+/).filter(Boolean));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingText(false);
    }
  }, [mode, modeValue, punctuation, numbers]);

  function applyCustomText(ct) {
    resetTest();
    setMode(ct.type === 'code' ? 'custom-code' : 'custom');
    setCustomMeta({ id: ct.id, title: ct.title });
    setCodeLanguage(ct.language || null);
    setTargetWords(ct.content.split(/\s+/).filter(Boolean));
  }

  useEffect(() => {
    if (mode === 'custom' || mode === 'custom-code') return; // loaded externally
    resetTest();
    loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, modeValue, punctuation, numbers]);

  useEffect(() => {
    setTimeLeft(mode === 'time' ? modeValue : 0);
  }, [mode, modeValue]);

  function resetTest() {
    clearInterval(intervalRef.current);
    setWordIndex(0);
    setCurrentInput('');
    setTypedWords([]);
    setStatus('idle');
    setTimeLeft(mode === 'time' ? modeValue : 0);
    setLiveWpm(0);
    setLiveAcc(100);
    setResult(null);
    setNewAchievements([]);
    setSubmitError('');
    startTimeRef.current = null;
    wpmSamplesRef.current = [];
    statsAccRef.current = { correct: 0, incorrect: 0, extra: 0, missed: 0, errorMap: {} };
  }

  function restart() {
    resetTest();
    if (mode === 'custom' || mode === 'custom-code') {
      // re-shuffle not needed, just reset indices; content stays
    } else {
      loadContent();
    }
    // Defer focus until after React re-renders the typing area
    setTimeout(() => containerRef.current?.focus(), 0);
  }

  const startTimerIfNeeded = useCallback(() => {
    if (startTimeRef.current) return;
    startTimeRef.current = Date.now();
    setStatus('running');

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const acc = statsAccRef.current;
      const correctSoFar = acc.correct;
      const totalSoFar = acc.correct + acc.incorrect;
      const wpm = computeWpm(correctSoFar, elapsed);
      wpmSamplesRef.current.push(wpm);
      setLiveWpm(wpm);
      setLiveAcc(totalSoFar > 0 ? Math.round((correctSoFar / totalSoFar) * 100) : 100);

      if (mode === 'time') {
        setTimeLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            finishTest();
            return 0;
          }
          return next;
        });
      }
    }, 1000);
  }, [mode]);

  function finishTest() {
    clearInterval(intervalRef.current);
    setStatus('finished');

    const elapsed = Date.now() - (startTimeRef.current || Date.now());
    const acc = statsAccRef.current;
    const totalTyped = acc.correct + acc.incorrect;
    const accuracy = totalTyped > 0 ? Math.round((acc.correct / totalTyped) * 1000) / 10 : 100;
    const rawWpm = computeWpm(totalTyped + acc.extra, elapsed);
    const wpm = computeWpm(acc.correct, elapsed);
    const consistency = computeConsistency(wpmSamplesRef.current);

    const finalResult = {
      mode: mode.startsWith('custom') ? (mode === 'custom-code' ? 'code' : 'custom') : mode,
      modeValue: mode === 'time' ? String(modeValue) : mode === 'words' ? String(modeValue) : (customMeta?.id ? String(customMeta.id) : mode),
      wpm, rawWpm, accuracy, consistency,
      correctChars: acc.correct, incorrectChars: acc.incorrect,
      extraChars: acc.extra, missedChars: acc.missed,
      durationSeconds: Math.round(elapsed / 1000),
      charErrorMap: acc.errorMap,
      wpmHistory: wpmSamplesRef.current.map((w, i) => ({ time: i + 1, wpm: w }))
    };
    setResult(finalResult);

    if (user) {
      api.submitTest(finalResult)
        .then((res) => setNewAchievements(res.newAchievements || []))
        .catch((e) => setSubmitError(e.message));
    }
  }

  function finalizeCurrentWord(withTrailingSpace) {
    const target = targetWords[wordIndex] || '';
    const cmp = compareWord(target, currentInput);
    statsAccRef.current = {
      correct: statsAccRef.current.correct + cmp.correct,
      incorrect: statsAccRef.current.incorrect + cmp.incorrect,
      extra: statsAccRef.current.extra + cmp.extra,
      missed: statsAccRef.current.missed + cmp.missed,
      errorMap: mergeErrorMaps(statsAccRef.current.errorMap, cmp.errorMap)
    };
    // account for the space itself as a correct character (except after last word)
    if (withTrailingSpace) {
      statsAccRef.current.correct += 1;
    }
    setTypedWords((prev) => [...prev, { target, typed: currentInput }]);
    setCurrentInput('');
  }

  function handleKeyDown(e) {
    if (status === 'finished') return;
    if (loadingText || targetWords.length === 0) return;

    const isLastWord = wordIndex === targetWords.length - 1;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentInput.length > 0) {
        setCurrentInput((s) => s.slice(0, -1));
      } else if (wordIndex > 0) {
        // move back into previous word for correction
        const prevWord = typedWords[typedWords.length - 1];
        if (prevWord) {
          setTypedWords((prev) => prev.slice(0, -1));
          setCurrentInput(prevWord.typed);
          setWordIndex((i) => i - 1);
          // undo the stats we counted for that word (approximate: recompute is complex,
          // so we simply don't double count by recomputing counts from scratch on finalize again).
          const cmp = compareWord(prevWord.target, prevWord.typed);
          statsAccRef.current = {
            correct: statsAccRef.current.correct - cmp.correct - 1,
            incorrect: statsAccRef.current.incorrect - cmp.incorrect,
            extra: statsAccRef.current.extra - cmp.extra,
            missed: statsAccRef.current.missed - cmp.missed,
            errorMap: statsAccRef.current.errorMap
          };
        }
      }
      return;
    }

    if (e.key === ' ') {
      e.preventDefault();
      if (currentInput.length === 0) return; // ignore leading spaces
      startTimerIfNeeded();
      if (isLastWord) {
        finalizeCurrentWord(false);
        finishTest();
      } else {
        finalizeCurrentWord(true);
        setWordIndex((i) => i + 1);
      }
      return;
    }

    if (e.key.length === 1) {
      e.preventDefault();
      startTimerIfNeeded();
      const target = targetWords[wordIndex] || '';
      const nextInput = currentInput + e.key;
      setCurrentInput(nextInput);

      if (isLastWord && nextInput.length >= target.length) {
        // auto-finish once the last word reaches full length
        setTimeout(() => {
          setCurrentInput(nextInput);
          finalizeCurrentWordAndFinish(target, nextInput);
        }, 0);
      } else if (!isLastWord && nextInput.length > target.length + 10) {
        // hard cap on runaway extra characters
        setCurrentInput(nextInput.slice(0, target.length + 10));
      }
    }
  }

  function finalizeCurrentWordAndFinish(target, typed) {
    const cmp = compareWord(target, typed);
    statsAccRef.current = {
      correct: statsAccRef.current.correct + cmp.correct,
      incorrect: statsAccRef.current.incorrect + cmp.incorrect,
      extra: statsAccRef.current.extra + cmp.extra,
      missed: statsAccRef.current.missed + cmp.missed,
      errorMap: mergeErrorMaps(statsAccRef.current.errorMap, cmp.errorMap)
    };
    setTypedWords((prev) => [...prev, { target, typed }]);
    finishTest();
  }

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (customMeta) containerRef.current?.focus();
  }, [customMeta]);

  const isTimeMode = mode === 'time';
  const isWordsMode = mode === 'words';
  const isQuoteMode = mode === 'quote';
  const isCodeMode = mode === 'code' || mode === 'custom-code';
  const isCustomMode = mode === 'custom' || mode === 'custom-code';

  return (
    <div>
      {status !== 'finished' && (
        <>
          <div className="mode-bar">
            {!isCustomMode && (
              <>
                <button className={punctuation ? 'active' : ''} onClick={() => setPunctuation((p) => !p)} disabled={isQuoteMode || isCodeMode}>
                  @ punctuation
                </button>
                <button className={numbers ? 'active' : ''} onClick={() => setNumbers((n) => !n)} disabled={isQuoteMode || isCodeMode}>
                  # numbers
                </button>
                <span className="divider" />
                <button className={isTimeMode ? 'active' : ''} onClick={() => setMode('time')}>time</button>
                <button className={isWordsMode ? 'active' : ''} onClick={() => setMode('words')}>words</button>
                <button className={isQuoteMode ? 'active' : ''} onClick={() => setMode('quote')}>quote</button>
                <button className={mode === 'code' ? 'active' : ''} onClick={() => setMode('code')}>code</button>
                <span className="divider" />
              </>
            )}
            {isTimeMode && TIME_OPTIONS.map((t) => (
              <button key={t} className={modeValue === t ? 'active' : ''} onClick={() => setModeValue(t)}>{t}</button>
            ))}
            {isWordsMode && WORD_OPTIONS.map((w) => (
              <button key={w} className={modeValue === w ? 'active' : ''} onClick={() => setModeValue(w)}>{w}</button>
            ))}
            {isQuoteMode && <button onClick={loadContent}>🔄 new quote</button>}
            {mode === 'code' && <span>{codeLanguage} · <button onClick={loadContent}>🔄 new snippet</button></span>}
            {isCustomMode && (
              <span>📄 {customMeta?.title} {codeLanguage ? `(${codeLanguage})` : ''} · <button onClick={() => navigate('/texts')}>choose another</button></span>
            )}
          </div>

          <div className="live-stats">
            {isTimeMode ? (
              <div>{timeLeft}<span className="label">seconds</span></div>
            ) : (
              <div>{liveWpm}<span className="label">wpm</span></div>
            )}
            <div>{liveAcc}%<span className="label">accuracy</span></div>
          </div>

          <div
            ref={containerRef}
            className={`typing-area ${focused ? '' : 'blurred'}`}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          >
            {loadingText || targetWords.length === 0 ? (
              <span style={{ color: 'var(--sub-color)' }}>loading…</span>
            ) : (
              renderWords(targetWords, typedWords, wordIndex, currentInput)
            )}
          </div>
          {!focused && <div className="click-to-focus">click here or start typing to focus</div>}
        </>
      )}

      {status === 'finished' && result && (
        <ResultPanel
          result={result}
          newAchievements={newAchievements}
          submitError={submitError}
          loggedIn={!!user}
          onRestart={restart}
        />
      )}
    </div>
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

function ResultPanel({ result, newAchievements, submitError, loggedIn, onRestart }) {
  return (
    <div className="panel result-panel">
      {newAchievements.length > 0 && (
        <div style={{ marginBottom: 20, textAlign: 'left' }}>
          {newAchievements.map((a) => (
            <div className="new-achievement-toast" key={a.key}>
              <span className="icon">{a.icon}</span>
              <div>
                <div className="name">Achievement unlocked: {a.name}</div>
                <div className="desc">{a.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="result-grid">
        <div>
          <div className="big">{result.wpm}</div>
          <div className="lbl">wpm</div>
        </div>
        <div>
          <div className="big">{result.accuracy}%</div>
          <div className="lbl">accuracy</div>
        </div>
        <div>
          <div className="big">{result.rawWpm}</div>
          <div className="lbl">raw wpm</div>
        </div>
        <div>
          <div className="big">{result.consistency}%</div>
          <div className="lbl">consistency</div>
        </div>
        <div>
          <div className="big">{result.durationSeconds}s</div>
          <div className="lbl">time</div>
        </div>
      </div>
      {!loggedIn && (
        <p style={{ color: 'var(--sub-color)' }}>Log in to save your results, build streaks, and earn achievements.</p>
      )}
      {submitError && <p className="auth-error">{submitError}</p>}
      <button className="btn" onClick={onRestart}>Try again</button>
    </div>
  );
}
