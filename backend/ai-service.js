const OpenAI = require('openai');
const { GoogleGenAI } = require('@google/genai');

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  return new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1'
  });
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  return new GoogleGenAI({ apiKey });
}

function buildParishContext({ announcements = [], events = [], readings = [] }) {
  const annText = announcements.slice(0, 5).map(a =>
    `Announcement: ${a.title}\n${a.content}\nDate: ${a.date || 'N/A'}`
  ).join('\n\n');

  const eventText = events.slice(0, 5).map(e =>
    `Event: ${e.title}\n${e.description}\nDate: ${e.date || 'N/A'} ${e.time || ''}`
  ).join('\n\n');

  const readingText = readings.slice(0, 5).map(r =>
    `${r.title}\n${r.content}`
  ).join('\n\n');

  return `
PARISH CONTEXT
==============
Announcements:
${annText || 'None available.'}

Events:
${eventText || 'None available.'}

Today's readings:
${readingText || 'None available.'}
`.trim();
}

function buildPrompt({ userMessage, parishContext }) {
  return `
You are Rita, a Catholic assistant for St. Rita Parish.

Rules:
- Answer only Catholic-related or St. Rita Parish-related questions.
- If a question is unrelated, politely refuse with a sorry and say you can only help with parish and Catholic related information.
- Be warm, respectful, clear, and simple.
- Do not pretend to be clergy.
- Do not invent official Church doctrine, Bible verses, or parish facts.
- If the question concerns a personal sacramental or serious spiritual situation, answer carefully and recommend speaking with a priest.
- Prefer parish-specific information when the question is about St. Rita Parish.
- Keep answers concise but helpful.
- The name of Parish Priest is Fr. Dr. Elias Kinoti Kithuri
- Use the provided parish context to answer questions about St. Rita Parish, including announcements, events, contact information, and daily readings.
- St. Rita Parish masses are at 9am and 11am on Sundays, and 7am on weekdays. The parish is located at Nchiru near Meru University of Science and Technology.
- Keep most answers under 150 words unless the user clearly asks for more detail.

${parishContext}

User question:
${userMessage}
`.trim();
}

function isGroqTemporaryFailure(err) {
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '').toLowerCase();
  const status = Number(err?.status || 0);

  return (
    status === 429 ||
    status === 503 ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('resource exhausted') ||
    code.includes('rate') ||
    code.includes('quota')
  );
}

async function askGroq(prompt) {
  const client = getGroqClient();
  if (!client) {
    throw new Error('NO_GROQ_API_KEY');
  }

  const response = await client.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: 'You are Rita, a Catholic assistant for St. Rita Parish.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.4,
    max_tokens: 300
  });

  return response.choices?.[0]?.message?.content?.trim() || '';
}

async function askGemini(prompt) {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('NO_GEMINI_API_KEY');
  }

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });

  return String(response.text || '').trim();
}

async function getCatholicChatResponse({ userMessage, parishContext }) {
  const prompt = buildPrompt({ userMessage, parishContext });

  // 1. Primary: Groq
  try {
    const groqReply = await askGroq(prompt);
    if (groqReply) {
      console.log('[AI] Groq success');
      return groqReply;
    }
  } catch (err) {
    console.warn('[AI] Groq failed:', err.message);

    // If Groq failed for a reason that is not a temporary/free-tier issue,
    // we still allow Gemini fallback because that is your desired structure.
  }

  // 2. Fallback: Gemini
  try {
    const geminiReply = await askGemini(prompt);
    if (geminiReply) {
      console.log('[AI] Gemini fallback success');
      return geminiReply;
    }
  } catch (err) {
    console.warn('[AI] Gemini fallback failed:', err.message);

    if (err.message === 'NO_GEMINI_API_KEY') {
      throw new Error('NO_FALLBACK_PROVIDER');
    }
  }

  return 'Rita is a bit busy right now. Please try again in a moment.';
}

module.exports = {
  buildParishContext,
  getCatholicChatResponse
};