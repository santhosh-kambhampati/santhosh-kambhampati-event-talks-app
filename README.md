# BigQuery Release Radar

BigQuery Release Radar is a responsive, dark-themed Flask web application that tracks release updates from the Google Cloud BigQuery Atom RSS feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`). It parses the feed dynamically, splits feed entries into discrete update cards, enables full search/filtering, and supports selecting any specific update to draft and post to X/Twitter.

## Features

- **Dynamic Atom Feed Parsing**: Automatically fetches, parses, and splits nested entry contents (separated by H3 tags in Google Cloud's RSS feed) into distinct, filterable release notes.
- **Rich User Experience & Responsive Design**: Crafted with custom scrollbars, gradient glows, flex/grid card layouts, skeleton loading shimmers, and interactive hover animations.
- **Search & Filter Controls**: Real-time client-side search across update text, types, or dates, alongside tag-based category filtering (Feature, Change, Issue, Breaking, Announcement).
- **Tweet Composer Modal**: Uses modern HTML5 native `<dialog>` overlays (with standard light-dismiss mouse logic and Safari fallbacks) to preview and compose a tweet, complete with a circular visual character counter ring and Twitter/X Web Intent integration.
- **Reliable Refresh Action**: A dedicated refresh button with active spinning indicator to fetch fresh feeds at any time.

## Project Structure

```
├── app.py                  # Flask Application & XML Parser
├── templates/
│   └── index.html          # Semantic HTML5 Layout & Native Dialogs
├── static/
│   ├── css/
│   │   └── style.css       # Design System CSS, Skeletons & Keyframes
│   └── js/
│       └── main.js         # API Fetch, Searching, Filters & Composer Logic
└── venv/                   # Python Virtual Environment (Flask, Requests)
```

## Running the Web App

The application runs on local port `5005` by default.

1. **Activate the Virtual Environment**:
   ```bash
   source venv/bin/activate
   ```
   *(Or just execute using `./venv/bin/python3` directly)*

2. **Start the Flask Server**:
   ```bash
   python app.py
   ```

3. **Open in Browser**:
   Navigate to `http://127.0.0.1:5005/` in your browser.
