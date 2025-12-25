# St. Rita Parish Website

A responsive, frontend-only Catholic parish website built with HTML, CSS, and vanilla JavaScript.

## Features

- **Home Page**: Welcome message, mass schedule, announcements preview, upcoming events preview
- **About**: Parish history, patron saint, mission and vision
- **Mass & Sacraments**: Mass timetable and sacraments overview
- **Groups & Ministries**: Choirs, youth group, CMA/CWA/PMC, Catechism & SCCs
- **Announcements & Events**: Full list of announcements and events
- **Gallery**: Responsive image grid with modal preview
- **Contact**: Contact details, frontend form, embedded Google Map
- **Admin Panel**: For adding announcements and songs (stores in localStorage)

## Technologies

- HTML5 with semantic elements
- CSS with Flexbox/Grid, mobile-first design
- Vanilla JavaScript
- JSON for data storage (frontend only)

## File Structure

- `index.html` - Home page
- `about.html` - About the parish
- `mass-sacraments.html` - Mass and sacraments info
- `groups-ministries.html` - Parish groups
- `announcements-events.html` - Announcements and events
- `gallery.html` - Photo gallery
- `contact.html` - Contact information
- `admin.html` - Admin panel
- `styles.css` - Stylesheet
- `app.js` - Main JavaScript
- `announcements.json` - Announcements data
- `events.json` - Events data
- `gallery.json` - Gallery images
- `readings.json` - Daily readings (legacy)

## Design

- Church-appropriate colors: white, blue, green, gold
- Clean, simple typography
- Responsive design
- Accessible navigation

## Running the Site

Open `index.html` in a web browser. For full functionality, serve the files from a local web server to handle JSON fetches.

## Future Integration

The code is structured for easy backend integration. JSON files can be replaced with API calls.
