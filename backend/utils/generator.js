const words = require('../data/words.json');
const quotes = require('../data/quotes.json');
const codeSnippets = require('../data/codeSnippets.json');

// Simple deterministic PRNG (mulberry32) so daily challenges are reproducible from a seed.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromDate(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function generateWords(count = 25, rng = Math.random) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(words[Math.floor(rng() * words.length)]);
  }
  return out.join(' ');
}

function getRandomQuote(rng = Math.random) {
  return quotes[Math.floor(rng() * quotes.length)];
}

function getRandomCodeSnippet(rng = Math.random) {
  return codeSnippets[Math.floor(rng() * codeSnippets.length)];
}

module.exports = { generateWords, getRandomQuote, getRandomCodeSnippet, mulberry32, seedFromDate, words, quotes, codeSnippets };
