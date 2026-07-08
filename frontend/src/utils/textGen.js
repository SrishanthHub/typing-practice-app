// Adds optional punctuation/number flavor to a plain word list, MonkeyType-style toggles.
export function decorateWords(rawWords, { punctuation, numbers }) {
  const words = rawWords.slice();
  const punctMarks = [',', '.', '!', '?'];

  if (numbers) {
    // Sprinkle a few numeric "words" through the list
    const count = Math.max(1, Math.floor(words.length * 0.12));
    for (let i = 0; i < count; i++) {
      const pos = Math.floor(Math.random() * words.length);
      const digits = Math.floor(Math.random() * 4) + 1;
      let num = '';
      for (let d = 0; d < digits; d++) num += Math.floor(Math.random() * 10);
      words[pos] = num;
    }
  }

  if (punctuation) {
    let capitalizeNext = true;
    for (let i = 0; i < words.length; i++) {
      if (capitalizeNext && /^[a-z]/.test(words[i])) {
        words[i] = words[i][0].toUpperCase() + words[i].slice(1);
      }
      capitalizeNext = false;

      // Randomly attach commas mid-sentence, and terminal punctuation every 6-12 words
      if (i > 0 && i % (Math.floor(Math.random() * 3) + 5) === 0) {
        const mark = punctMarks[Math.floor(Math.random() * punctMarks.length)];
        words[i] = words[i] + mark;
        if (mark === '.' || mark === '!' || mark === '?') capitalizeNext = true;
      } else if (Math.random() < 0.08) {
        words[i] = words[i] + ',';
      }
    }
    // Ensure the passage ends with terminal punctuation
    const last = words[words.length - 1];
    if (!/[.!?]$/.test(last)) words[words.length - 1] = last.replace(/,$/, '') + '.';
  }

  return words;
}

// Standard deviation based consistency score (0-100, higher = steadier pace)
export function computeConsistency(wpmSamples) {
  if (!wpmSamples || wpmSamples.length < 2) return 100;
  const mean = wpmSamples.reduce((a, b) => a + b, 0) / wpmSamples.length;
  if (mean === 0) return 100;
  const variance = wpmSamples.reduce((a, b) => a + (b - mean) ** 2, 0) / wpmSamples.length;
  const stdDev = Math.sqrt(variance);
  const consistency = 100 - (stdDev / mean) * 100;
  return Math.max(0, Math.min(100, Math.round(consistency)));
}

export function computeWpm(charCount, elapsedMs) {
  const minutes = elapsedMs / 1000 / 60;
  if (minutes <= 0) return 0;
  return Math.round((charCount / 5) / minutes);
}
