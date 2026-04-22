const fetch = require('node-fetch');

const MYMEMORY_BASE_URL = 'https://api.mymemory.translated.net/get';
const LIBRE_BASE_URL = 'https://libretranslate.de/translate';

const CONTACT_EMAIL = 'maverickmarkyu@gmail.com';

const cache = new Map();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* =========================
   TRANSLATORS
   ========================= */

async function translateMyMemory(text, attempt = 1) {
  const url = new URL(MYMEMORY_BASE_URL);
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', 'en|sw');
  url.searchParams.set('de', CONTACT_EMAIL);

  const res = await fetch(url.toString());

  if (res.status === 429) {
    if (attempt >= 3) throw new Error('MyMemory 429');
    await sleep(2000 * attempt);
    return translateMyMemory(text, attempt + 1);
  }

  if (!res.ok) {
    throw new Error(`MyMemory failed: ${res.status}`);
  }

  const data = await res.json();
  return data?.responseData?.translatedText;
}

async function translateLibre(text) {
  const res = await fetch(LIBRE_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      q: text,
      source: 'en',
      target: 'sw',
      format: 'text'
    })
  });

  if (!res.ok) {
    throw new Error(`LibreTranslate failed: ${res.status}`);
  }

  const data = await res.json();
  return data?.translatedText;
}

/* =========================
   MAIN TRANSLATION PIPELINE
   ========================= */

async function translateChunk(text) {
  if (!text || !String(text).trim()) return '';

  const normalizedText = String(text).trim();

  if (cache.has(normalizedText)) {
    return cache.get(normalizedText);
  }

  let translated = null;

  // 🔥 TRY 1: MyMemory
  try {
    translated = await translateMyMemory(normalizedText);
    console.log('[TRANSLATE] MyMemory success');
  } catch (err) {
    console.warn('[TRANSLATE] MyMemory failed:', err.message);
  }

  // 🔥 TRY 2: LibreTranslate
  if (!translated || translated.trim() === '') {
    try {
      translated = await translateLibre(normalizedText);
      console.log('[TRANSLATE] LibreTranslate success');
    } catch (err) {
      console.warn('[TRANSLATE] LibreTranslate failed:', err.message);
    }
  }

  if (!translated || !String(translated).trim()) {
    throw new Error('All translators failed');
  }

  const finalText = String(translated).trim();
  cache.set(normalizedText, finalText);

  return finalText;
}

/* =========================
   PARSING
   ========================= */

function extractSection(text, startMarker, endMarker = null) {
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) return '';

  const fromStart = text.slice(startIndex + startMarker.length);

  if (!endMarker) return fromStart.trim();

  const endIndex = fromStart.indexOf(endMarker);
  return endIndex === -1 ? fromStart.trim() : fromStart.slice(0, endIndex).trim();
}

function cleanSection(text) {
  return String(text || '')
    .replace(/\[.*?\]/g, '')
    .replace(/<<<.*?>>>/g, '')
    .trim();
}

function looksLikeUntranslatedEnglish(original, translated) {
  const o = String(original || '').toLowerCase();
  const t = String(translated || '').toLowerCase();

  if (o === t) return true;

  const signals = [
    'reading',
    'gospel',
    'psalm',
    'alleluia',
    'jesus said',
    'there broke out'
  ];

  return signals.filter(s => t.includes(s)).length >= 2;
}

/* =========================
   READING BLOCK
   ========================= */

async function translateReadingBlock({ title, content, day_title }) {
  const combined = `
<<<TITLE>>>
${title}

<<<DAY>>>
${day_title || ''}

<<<CONTENT>>>
${content}
`;

  const translated = await translateChunk(combined);

  const tTitle = cleanSection(
    extractSection(translated, '<<<TITLE>>>', '<<<DAY>>>')
  ) || title;

  const tDay = cleanSection(
    extractSection(translated, '<<<DAY>>>', '<<<CONTENT>>>')
  ) || day_title;

  const tContent = cleanSection(
    extractSection(translated, '<<<CONTENT>>>')
  ) || content;

  const unchangedCount = [
    looksLikeUntranslatedEnglish(title, tTitle),
    looksLikeUntranslatedEnglish(day_title, tDay),
    looksLikeUntranslatedEnglish(content, tContent)
  ].filter(Boolean).length;

  if (unchangedCount >= 2) {
    throw new Error('Translation looks like English');
  }

  return {
    title: tTitle,
    day_title: tDay,
    content: tContent
  };
}

module.exports = {
  translateReadingBlock
};