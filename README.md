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
3. Set `DATABASE_PATH` on hosted deployments if you need SQLite persistence outside the repo folder. On Render, add a persistent disk and point `DATABASE_PATH` (or `RENDER_DISK_MOUNT_PATH`) at that mount.
4. Start backend: `node backend/server.js`
5. Start readings cron: `node backend/cron.js`
6. Open `index.html` in your browser

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
