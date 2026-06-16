# BigQuery Release Radar

BigQuery Release Radar is a sleek, glassmorphic Python Flask and vanilla JavaScript web application that reads the official Google Cloud BigQuery release notes Atom feed, splits combined logs into individual updates, categorizes them, and provides a custom composer mockup to share updates directly on X/Twitter.

---

## Features

- **Granular Updates**: Splits monolithic daily updates from the feed into individual cards (Features, Issues, Deprecations, Changes, General Updates).
- **Caching**: Implements a 5-minute server-side in-memory cache to ensure near-instant load times and avoid rate-limiting.
- **Interactive UI**: Includes live keyword searches, category filtering, dynamic category counter badges, and relative time tracking (e.g., *Updated 2m ago*).
- **Tweet Composer Mockup**: Generates a pre-formatted, 280-character-safe share preview of any selected release note complete with hashtags and links. Allows custom editing, copying to clipboard, and automated X/Twitter posting.

---

## Tech Stack

- **Backend**: Python 3.x, Flask, `requests`, `feedparser`, `beautifulsoup4`
- **Frontend**: HTML5, Vanilla CSS3 (Custom design system variables, glassmorphic themes), Vanilla JavaScript (ES6+), Lucide Icons

---

## Project Structure

```text
├── app.py              # Flask server, feed parsing, and cache controller
├── requirements.txt    # Python packages list
├── .gitignore          # Excluded folders (venv, __pycache__, IDE configs)
├── templates/
│   └── index.html      # UI structure with Lucide icons and Inter typography
└── static/
    ├── css/
    │   └── style.css   # Dark theme, layout classes, modal, and animations
    └── js/
        └── app.js      # Fetching, filtering, counting, and tweet formatting
```

---

## Getting Started

### Prerequisites
Make sure you have Python 3 installed on your system.

### 1. Setup Virtual Environment
In your command prompt or PowerShell, run:
```powershell
# Create the virtual environment
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\activate
```

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 3. Run the Application
```powershell
python app.py
```
By default, the server runs in debug mode and is accessible at:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## Git & GitHub Integration

This project is configured with a Git repository. To push this project to your GitHub:

1. Create an empty repository named **`GDG-Event-talks-app`** on your GitHub account (do not add a README or `.gitignore` online).
2. Set the remote origin and push the main branch:
   ```powershell
   git remote add origin https://github.com/Abhi4921/GDG-Event-talks-app.git
   git push -u origin main
   ```
