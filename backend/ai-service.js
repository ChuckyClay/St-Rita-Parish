const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
  const systemPrompt = `
You are a Catholic assistant for St. Rita Parish.

Rules:
- Answer only Catholic-related or St. Rita Parish-related questions.
- If a question is unrelated, politely refuse and say you can help with Catholic faith, parish information, sacraments, Mass, saints, prayers, readings, announcements, and events.
- Be warm, respectful, clear, and simple.
- Do not pretend to be clergy.
- Do not invent official Church doctrine, Bible verses, or parish facts.
- If the question concerns a personal sacramental or serious spiritual situation, answer carefully and recommend speaking with a priest.
- Prefer parish-specific information when the question is about St. Rita Parish.
- Keep answers concise but helpful.
`.trim();

  const response = await client.responses.create({
    model: 'gpt-5.4-mini',
    input: [
      {
        role: 'system',
        content: [
          { type: 'input_text', text: systemPrompt }
        ]
      },
      {
        role: 'system',
        content: [
          { type: 'input_text', text: parishContext }
        ]
      },
      {
        role: 'user',
        content: [
          { type: 'input_text', text: userMessage }
        ]
      }
    ]
  });

  return response.output_text;
}

module.exports = {
  buildParishContext,
  getCatholicChatResponse
};