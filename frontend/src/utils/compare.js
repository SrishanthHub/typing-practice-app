// Compares what the user typed for one word against the target word.
// Returns counts used to build the final score plus a map of which target
// characters were mistyped (used to build the keyboard heatmap).
export function compareWord(target, typed) {
  let correct = 0, incorrect = 0, extra = 0, missed = 0;
  const errorMap = {};
  const maxLen = Math.max(target.length, typed.length);

  for (let i = 0; i < maxLen; i++) {
    const t = target[i];
    const u = typed[i];
    if (t === undefined) {
      extra++;
    } else if (u === undefined) {
      missed++;
    } else if (t === u) {
      correct++;
    } else {
      incorrect++;
      const key = t.toLowerCase();
      errorMap[key] = (errorMap[key] || 0) + 1;
    }
  }
  return { correct, incorrect, extra, missed, errorMap };
}

export function mergeErrorMaps(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] || 0) + v;
  return out;
}
