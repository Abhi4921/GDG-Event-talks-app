import os
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request
import time

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_DURATION = 300  # 5 minutes
cached_data = None
last_fetched = 0

def fetch_and_parse_feed(force=False):
    global cached_data, last_fetched
    now = time.time()
    if not force and cached_data and (now - last_fetched < CACHE_DURATION):
        return cached_data

    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        # Parse XML with feedparser
        feed = feedparser.parse(response.content)
        
        parsed_entries = []
        for entry in feed.entries:
            date = entry.get('title', 'Unknown Date')
            updated = entry.get('updated', '')
            link = entry.get('link', '')
            entry_id = entry.get('id', '')
            
            content_html = ""
            if 'content' in entry and len(entry.content) > 0:
                content_html = entry.content[0].value
            elif 'summary' in entry:
                content_html = entry.summary
                
            soup = BeautifulSoup(content_html, 'html.parser')
            
            current_type = "Update"
            current_content = []
            sub_updates = []
            
            # BeautifulSoup contents are the direct children
            for child in soup.contents:
                if child.name == 'h3':
                    if current_content:
                        sub_updates.append((current_type, current_content))
                        current_content = []
                    current_type = child.get_text().strip()
                else:
                    if str(child).strip():
                        current_content.append(child)
            
            if current_content:
                sub_updates.append((current_type, current_content))
                
            # If no h3 headings were found, it means the entry had content but no h3 titles.
            # In that case, sub_updates will have one element with type "Update".
            for idx, (utype, ucontent_nodes) in enumerate(sub_updates):
                ucontent_html = "".join(str(node) for node in ucontent_nodes).strip()
                
                # Get clean text
                u_soup = BeautifulSoup(ucontent_html, 'html.parser')
                u_text = u_soup.get_text().strip()
                
                # Create a unique sub-ID
                u_id = f"{entry_id}_{idx}"
                
                parsed_entries.append({
                    "id": u_id,
                    "date": date,
                    "type": utype,
                    "content_html": ucontent_html,
                    "text": u_text,
                    "link": link
                })
                
        cached_data = parsed_entries
        last_fetched = now
        return cached_data
    except Exception as e:
        print(f"Error fetching feed: {e}")
        if cached_data:
            return cached_data
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force = request.args.get('refresh', 'false').lower() == 'true'
    try:
        data = fetch_and_parse_feed(force=force)
        return jsonify({
            "success": True, 
            "data": data,
            "last_fetched": last_fetched
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    # Listen on all interfaces so it can be accessed locally
    app.run(debug=True, host='0.0.0.0', port=5000)
