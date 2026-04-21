const OpenAI = require('openai');

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return null;

  return new OpenAI({ apiKey });
}

function buildParishContext({ announcements = [], events = [], readings = [] }) {
  const annText = announcements.slice(0, 5).map(a =>
    `Announcement: ${a.title}\n${a.content}`
  ).join('\n\n');

  const eventText = events.slice(0, 5).map(e =>
    `Event: ${e.title}\n${e.description}`
  ).join('\n\n');

  const readingText = readings.slice(0, 5).map(r =>
    `${r.title}\n${r.content}`
  ).join('\n\n');

  return `
PARISH CONTEXT:
${annText}

${eventText}

${readingText}
`;
}

async function getCatholicChatResponse({ userMessage, parishContext }) {
  const client = getClient();

  if (!client) {
    throw new Error('NO_API_KEY');
  }

  const response = await client.responses.create({
    model: 'gpt-5.4-mini',
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: `You are Rita, a Catholic assistant for St. Rita Parish.

Answer Catholic questions clearly and simply.
Stay within Catholic faith and parish context.
Be warm and respectful.
If unsure, say so.
If personal spiritual advice is needed, recommend speaking to a priest.`
          }
        ]
      },
      {
        role: 'system',
        content: [{ type: 'input_text', text: parishContext }]
      },
      {
        role: 'user',
        content: [{ type: 'input_text', text: userMessage }]
      }
    ]
  });

  return response.output_text;
}

module.exports = {
  buildParishContext,
  getCatholicChatResponse
};