# St. Rita Parish Website

Production-ready Catholic parish website with:

- Modern responsive frontend (HTML, CSS, JS)
- Node.js/Express backend with secure JWT admin authentication
- Admin panel for announcements, events, messages, and phone management
- Automated daily Catholic readings (external API)
- Data stored in JSON files (no database required)
- Security best practices: environment variables, input validation, rate limiting, helmet

## Quick Start

1. Install dependencies: `npm install` (in backend)
2. Set up `.env` with secrets (see backend/.env.example)
3. Start backend: `node backend/server.js`
4. Start readings cron: `node backend/cron.js`
5. Open `index.html` in your browser

## File Structure

- Frontend: `index.html`, `about.html`, `admin.html`, etc.
- Backend: `backend/` (Express server, routes, data)
- Data: `announcements.json`, `events.json`, `messages.json`, `phones.json`, `readings.json`

## License
MIT

- Church-appropriate colors: white, blue, green, gold
- Clean, simple typography
- Responsive design
- Accessible navigation

## Running the Site

Open `index.html` in a web browser. For full functionality, serve the files from a local web server to handle JSON fetches.

## Future Integration

The code is structured for easy backend integration. JSON files can be replaced with API calls.
