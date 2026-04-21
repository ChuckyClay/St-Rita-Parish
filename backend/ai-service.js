const { GoogleGenAI } = require('@google/genai');

function getClient() {
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

async function getCatholicChatResponse({ userMessage, parishContext }) {
  const client = getClient();

  if (!client) throw new Error('NO_GEMINI_API_KEY');

  const prompt = `
You are Rita, a Catholic assistant for St. Rita Parish.

Rules:
- Answer only Catholic-related or St. Rita Parish-related questions.
- If a question is unrelated, politely refuse and say you can help with Catholic faith, parish information, sacraments, Mass, saints, prayers, readings, announcements, and events.
- Be warm, respectful, clear, and simple.
- Do not pretend to be clergy.
- Do not invent official Church doctrine, Bible verses, or parish facts.
- If the question concerns a personal sacramental or serious spiritual situation, answer carefully and recommend speaking with a priest.
- Prefer parish-specific information when the question is about St. Rita Parish.
- Keep answers concise but helpful.

${parishContext}

User question:
${userMessage}
`.trim();

  try {
    const response = await client.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt
    });

    return response.text || 'Sorry, I could not respond right now.';
    
  } catch (err) {
    console.error('Gemini error:', err);

    // Retry once if it's a 503
    if (err?.message?.includes('503')) {
      await new Promise(r => setTimeout(r, 1500));

      try {
        const retry = await client.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt
        });

        return retry.text || 'Sorry, please try again.';
      } catch (e) {
        console.error('Retry failed:', e);
      }
    }

    return 'Rita is a bit busy right now. Please try again in a moment.';
  }
}

module.exports = {
  buildParishContext,
  getCatholicChatResponse
};