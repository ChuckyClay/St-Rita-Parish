const fetch = require('node-fetch');

const MYMEMORY_BASE_URL = 'https://api.mymemory.translated.net/get';
const CONTACT_EMAIL = 'maverickmarkyu@gmail.com';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function translateChunk(text, attempt = 1) {
  if (!text || !String(text).trim()) return '';

  const url = new URL(MYMEMORY_BASE_URL);
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', 'en|sw');

  if (CONTACT_EMAIL && CONTACT_EMAIL !== 'maverickmarkyu@gmail.com') {
    url.searchParams.set('de', CONTACT_EMAIL);
  }

  const res = await fetch(url.toString());

  if (res.status === 429) {
    if (attempt >= 3) {
      throw new Error('Translation request failed: 429');
    }

    await sleep(2000 * attempt);
    return translateChunk(text, attempt + 1);
  }

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
    await sleep(1200);
  }

  return translated.join('\n');
}

module.exports = { translateText };