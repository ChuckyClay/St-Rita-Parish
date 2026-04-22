const fetch = require('node-fetch');

const MYMEMORY_BASE_URL = 'https://api.mymemory.translated.net/get';
const CONTACT_EMAIL = 'maverickmarkyu@gmail.com';

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

function cleanSection(text) {
  return String(text || '')
    .replace(/\[.*?\]/g, '')
    .replace(/<<<.*?>>>/g, '')
    .trim();
}

function looksLikeUntranslatedEnglish(original, translated) {
  const o = String(original || '').trim().toLowerCase();
  const t = String(translated || '').trim().toLowerCase();

  if (!o || !t) return false;

  // exactly same or almost same
  if (o === t) return true;
  if (t.includes(o) || o.includes(t)) return true;

  // obvious English phrases still present
  const englishSignals = [
    'reading 1',
    'responsorial psalm',
    'gospel',
    'alleluia',
    'wednesday of the third week of easter',
    'there broke out a severe persecution',
    'jesus said to the crowds'
  ];

  const hits = englishSignals.filter(p => t.includes(p)).length;
  return hits >= 2;
}

async function translateReadingBlock({ title, content, day_title }) {
  const safeTitle = String(title || '').trim();
  const safeContent = String(content || '').trim();
  const safeDayTitle = String(day_title || '').trim();

  const combined = [
    '<<<TITLE>>>',
    safeTitle,
    '<<<DAY>>>',
    safeDayTitle,
    '<<<CONTENT>>>',
    safeContent
  ].join('\n');

  const translated = await translateChunk(combined);

  const translatedTitle = cleanSection(
    extractSection(translated, '<<<TITLE>>>', '<<<DAY>>>')
  ) || safeTitle;

  const translatedDayTitle = cleanSection(
    extractSection(translated, '<<<DAY>>>', '<<<CONTENT>>>')
  ) || safeDayTitle;

  const translatedContent = cleanSection(
    extractSection(translated, '<<<CONTENT>>>')
  ) || safeContent;

  // 🔥 reject fake “translations”
  const unchangedCount = [
    looksLikeUntranslatedEnglish(safeTitle, translatedTitle),
    looksLikeUntranslatedEnglish(safeDayTitle, translatedDayTitle),
    looksLikeUntranslatedEnglish(safeContent, translatedContent)
  ].filter(Boolean).length;

  if (unchangedCount >= 2) {
    throw new Error('Translation returned mostly unchanged English text');
  }

  return {
    title: translatedTitle,
    day_title: translatedDayTitle,
    content: translatedContent
  };
}

module.exports = {
  translateReadingBlock
};