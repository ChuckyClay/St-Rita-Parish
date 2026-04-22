const fetch = require('node-fetch');

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
const EMAIL = process.env.MYMEMORY_EMAIL || '';

async function translateText(text) {
  const params = new URLSearchParams({
    q: text,
    langpair: 'en|sw',
  });

  if (EMAIL) params.append('de', EMAIL);

  const res = await fetch(`${MYMEMORY_URL}?${params.toString()}`);

  if (!res.ok) {
    throw new Error(`MyMemory request failed: ${res.status}`);
  }

  const data = await res.json();

  if (data.responseStatus !== 200) {
    throw new Error(`MyMemory error: ${data.responseDetails || data.responseStatus}`);
  }

  const translated = String(data.responseData?.translatedText || '').trim();

  if (!translated) {
    throw new Error('MyMemory returned empty translation.');
  }

  return translated;
}

async function translateReadingBlock({ title, content, day_title }) {
  const safeTitle = String(title || '').trim();
  const safeContent = String(content || '').trim();
  const safeDayTitle = String(day_title || '').trim();

  // Translate each field separately to stay within per-request limits
  const [translatedTitle, translatedContent, translatedDayTitle] = await Promise.all([
    safeTitle ? translateText(safeTitle) : Promise.resolve(''),
    safeContent ? translateText(safeContent) : Promise.resolve(''),
    safeDayTitle ? translateText(safeDayTitle) : Promise.resolve(''),
  ]);

  return {
    title: translatedTitle || safeTitle,
    content: translatedContent || safeContent,
    day_title: translatedDayTitle || safeDayTitle,
  };
}

module.exports = { translateReadingBlock };
