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

  // Translate sequentially with delays to avoid burst rate limits
  let translatedTitle = safeTitle;
  let translatedContent = safeContent;
  let translatedDayTitle = safeDayTitle;

  if (safeTitle) {
    translatedTitle = await translateText(safeTitle);
    await new Promise(resolve => setTimeout(resolve, 800)); // 800ms delay
  }

  if (safeContent) {
    translatedContent = await translateText(safeContent);
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  if (safeDayTitle) {
    translatedDayTitle = await translateText(safeDayTitle);
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  return {
    title: translatedTitle,
    content: translatedContent,
    day_title: translatedDayTitle,
  };
}

module.exports = { translateReadingBlock };
