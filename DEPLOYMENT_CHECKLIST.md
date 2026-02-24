# Deployment Checklist for St. Rita Parish Website

## 1. Code & Functionality
- [x] Backend fetches and stores daily readings automatically (cron job)
- [x] API endpoints for readings, announcements, events, messages, and phone subscriptions
- [x] Frontend displays daily readings, announcements, events, and supports contact/SMS forms

## 2. Environment & Configuration
- [ ] Set environment variables for production (e.g., database path, API keys)
- [ ] Update API URLs in frontend to use deployed backend URL
- [ ] Ensure CORS is enabled for frontend-backend communication
- [ ] Set up HTTPS (automatic on most platforms)

## 3. Database
- [ ] Use a persistent database (not local SQLite if using ephemeral disk)
- [ ] Migrate any local data if needed

## 4. Deployment Platform
- [ ] Choose a platform (Render, Railway, Heroku, etc.)
- [ ] Set up build/start commands (e.g., `node backend/server.js`)
- [ ] Configure static file hosting for HTML/CSS/JS
- [ ] Set up environment variables in platform dashboard

## 5. Monitoring & Testing
- [ ] Enable logging and error monitoring
- [ ] Test all features (readings, announcements, events, contact, SMS)
- [ ] Monitor for a few days before client presentation

## 6. Post-Deployment
- [ ] Update domain (optional)
- [ ] Set up admin access if needed
- [ ] Prepare documentation for client

---

**Tip:** You can redeploy and update the site anytime by pushing changes to your repository or uploading new files.
