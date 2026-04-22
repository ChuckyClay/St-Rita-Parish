const fetch = require('node-fetch');

const MYMEMORY_BASE_URL = 'https://api.mymemory.translated.net/get';
const CONTACT_EMAIL = 'maverickmarkyu@gmail.com';

// simple in-memory cache
const cache = new Map();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function translateChunk(text, attempt = 1) {
  if (!text || !String(text).trim()) return '';

  const normalizedText = String(text).trim();

  if (cache.has(normalizedText)) {
    return cache.get(normalizedText);
  }

  const url = new URL(MYMEMORY_BASE_URL);
  url.searchParams.set('q', normalizedText);
  url.searchParams.set('langpair', 'en|sw');
  url.searchParams.set('de', CONTACT_EMAIL);

  const res = await fetch(url.toString());

  if (res.status === 429) {
    if (attempt >= 4) {
      throw new Error('Translation request failed: 429');
    }

    const delay = 3000 * attempt;
    console.warn(`[TRANSLATE] 429 detected. Retrying in ${delay}ms`);
    await sleep(delay);

    return translateChunk(normalizedText, attempt + 1);
  }

  if (!res.ok) {
    throw new Error(`Translation request failed: ${res.status}`);
  }

  const data = await res.json();
  const translated = data?.responseData?.translatedText;

  if (!translated || !String(translated).trim()) {
    throw new Error('Invalid translation response');
  }

  const finalText = String(translated).trim();
  cache.set(normalizedText, finalText);

  return finalText;
}

function extractSection(text, startMarker, endMarker = null) {
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) return '';

  const fromStart = text.slice(startIndex + startMarker.length);

  if (!endMarker) {
    return fromStart.trim();
  }

  const endIndex = fromStart.indexOf(endMarker);
  if (endIndex === -1) {
    return fromStart.trim();
  }

  return fromStart.slice(0, endIndex).trim();
}

async function translateReadingBlock({ title, content, day_title }) {
  const safeTitle = String(title || '').trim();
  const safeContent = String(content || '').trim();
  const safeDayTitle = String(day_title || '').trim();

  // 🔥 Strong markers that won’t be translated
  const combined = `
<<<TITLE>>>
${safeTitle}

<<<DAY>>>
${safeDayTitle}

<<<CONTENT>>>
${safeContent}
`;

  const translated = await translateChunk(combined);

  // 🔥 Extract safely
  const getSection = (text, start, end) => {
    const s = text.indexOf(start);
    if (s === -1) return '';

    const from = text.slice(s + start.length);
    if (!end) return from.trim();

    const e = from.indexOf(end);
    return (e === -1 ? from : from.slice(0, e)).trim();
  };

  let tTitle = getSection(translated, '<<<TITLE>>>', '<<<DAY>>>');
  let tDay = getSection(translated, '<<<DAY>>>', '<<<CONTENT>>>');
  let tContent = getSection(translated, '<<<CONTENT>>>');

  // 🔥 CLEANUP: remove garbage like [MAUDHUI]
  const clean = (text) =>
    text
      .replace(/\[.*?\]/g, '') // remove [anything]
      .replace(/<<<.*?>>>/g, '') // remove leftover markers
      .trim();

  tTitle = clean(tTitle) || safeTitle;
  tDay = clean(tDay) || safeDayTitle;
  tContent = clean(tContent) || safeContent;

  return {
    title: tTitle,
    day_title: tDay,
    content: tContent
  };
}

module.exports = {
  translateReadingBlock
};