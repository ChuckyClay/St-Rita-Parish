St. Rita Parish — Frontend Prototype

Files created:
- frontend/index.html — public site (home, announcements, songs, groups)
- frontend/admin.html — admin prototype (stores to localStorage; placeholder for SMS)
- frontend/styles.css — styles
- frontend/app.js — client logic (loads sample readings, local announcements/songs)
- frontend/readings.json — sample daily reading

How to run
1. Open `frontend/index.html` in your browser (double-click or use the command below).

PowerShell:

```powershell
Start-Process .\frontend\index.html
```

Next steps
- Wire a backend API to provide live daily readings and to send SMS (Twilio, etc.).
- Replace localStorage with persistent backend endpoints for announcements and songs.
