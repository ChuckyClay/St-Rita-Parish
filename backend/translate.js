const fetch = require('node-fetch');

const MYMEMORY_BASE_URL = 'https://api.mymemory.translated.net/get';

// Put your real email here for higher free limit.
// If you leave it blank, MyMemory anonymous limit is much lower.
const CONTACT_EMAIL = 'maverickmarkyu@gmail.com';

async function translateChunk(text) {
  if (!text || !String(text).trim()) return '';

  const url = new URL(MYMEMORY_BASE_URL);
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', 'en|sw');

  if (CONTACT_EMAIL && CONTACT_EMAIL !== 'maverickmarkyu@gmail.com') {
    url.searchParams.set('de', CONTACT_EMAIL);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Translation request failed: ${res.status}`);
  }

  const data = await res.json();

  if (!data || !data.responseData || !data.responseData.translatedText) {
    throw new Error('Invalid translation response');
  }

  return data.responseData.translatedText;
}

function splitIntoChunks(text, maxLength = 400) {
  const clean = String(text || '').trim();
  if (!clean) return [];

  const parts = [];
  let current = '';

  for (const paragraph of clean.split('\n')) {
    const candidate = current ? `${current}\n${paragraph}` : paragraph;

    if (candidate.length > maxLength) {
      if (current) parts.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  if (current) parts.push(current);

  return parts;
}

async function translateText(text) {
  const chunks = splitIntoChunks(text, 400);
  const translated = [];

  for (const chunk of chunks) {
    const result = await translateChunk(chunk);
    translated.push(result);
  }

  return translated.join('\n');
}

module.exports = { translateText };