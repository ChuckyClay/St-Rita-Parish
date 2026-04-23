const fetch = require('node-fetch');
const { GoogleGenAI } = require('@google/genai');

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// ============================================
// MyMemory Translation (Primary)
// ============================================

async function translateWithMyMemory(text) {
  const params = new URLSearchParams({
    q: text,
    langpair: 'en|sw',
  });

  if (MYMEMORY_EMAIL) params.append('de', MYMEMORY_EMAIL);

  const res = await fetch(`${MYMEMORY_URL}?${params.toString()}`);

  if (!res.ok) {
    throw new Error(`MyMemory HTTP ${res.status}`);
  }

  const data = await res.json();

  if (data.responseStatus !== 200) {
    throw new Error(`MyMemory error: ${data.responseDetails || data.responseStatus}`);
  }

  const translated = String(data.responseData?.translatedText || '').trim();

  if (!translated) {
    throw new Error('MyMemory returned empty translation');
  }

  return translated;
}

// ============================================
// Gemini Translation (Fallback)
// ============================================

function getGeminiClient() {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

async function translateWithGemini(text, context = '') {
  const client = getGeminiClient();

  const prompt = `Translate the following English text to Kiswahili (Swahili). 
${context ? `Context: This is ${context} from Catholic daily Mass readings.` : ''}

Provide ONLY the Kiswahili translation with no explanation, no preamble, and no English text.

English text:
${text}`;

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });

  const translated = (response.text || '').trim();

  if (!translated) {
    throw new Error('Gemini returned empty translation');
  }

  return translated;
}

// ============================================
// Smart Translation with Fallback
// ============================================

async function translateText(text, context = '') {
  // Try MyMemory first
  try {
    const result = await translateWithMyMemory(text);
    console.log('[TRANSLATE] Used MyMemory');
    return result;
  } catch (myMemoryError) {
    console.warn('[TRANSLATE] MyMemory failed:', myMemoryError.message);
    
    // Fall back to Gemini
    try {
      const result = await translateWithGemini(text, context);
      console.log('[TRANSLATE] Fell back to Gemini');
      return result;
    } catch (geminiError) {
      console.error('[TRANSLATE] Both services failed. MyMemory:', myMemoryError.message, 'Gemini:', geminiError.message);
      throw new Error('Translation failed on both MyMemory and Gemini');
    }
  }
}

// ============================================
// Reading Block Translation
// ============================================

async function translateReadingBlock({ title, content, day_title }) {
  const safeTitle = String(title || '').trim();
  const safeContent = String(content || '').trim();
  const safeDayTitle = String(day_title || '').trim();

  let translatedTitle = safeTitle;
  let translatedContent = safeContent;
  let translatedDayTitle = safeDayTitle;

  // Small delay before starting
  await new Promise(resolve => setTimeout(resolve, 300));

  if (safeTitle) {
    translatedTitle = await translateText(safeTitle, 'a scripture citation or reading title');
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  if (safeContent) {
    translatedContent = await translateText(safeContent, 'scripture text');
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  if (safeDayTitle) {
    translatedDayTitle = await translateText(safeDayTitle, 'a liturgical day title');
  }

  return {
    title: translatedTitle,
    content: translatedContent,
    day_title: translatedDayTitle,
  };
}

module.exports = { translateReadingBlock };
