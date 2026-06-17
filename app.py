import os
import re
import xml.etree.ElementTree as ET
import requests
from flask import Flask, render_template, jsonify

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=10)
        response.raise_for_status()
        xml_text = response.text
        
        # Parse the XML
        # Atom feed namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        root = ET.fromstring(xml_text.encode('utf-8'))
        
        updates = []
        for index, entry in enumerate(root.findall('atom:entry', ns)):
            date_title = entry.find('atom:title', ns)
            date_str = date_title.text.strip() if date_title is not None else "Unknown Date"
            
            link_elem = entry.find("atom:link[@rel='alternate']", ns)
            if link_elem is None:
                link_elem = entry.find("atom:link", ns)
            
            base_link = link_elem.attrib.get('href', '') if link_elem is not None else ''
            
            content_elem = entry.find('atom:content', ns)
            content_html = content_elem.text if content_elem is not None else ""
            
            # Create a URL friendly anchor tag from the date title if not already present
            if base_link and '#' not in base_link:
                anchor_date = date_str.replace(' ', '_').replace(',', '')
                full_link = f"{base_link}#{anchor_date}"
            else:
                full_link = base_link
            
            # Split content_html by <h3> tags to isolate each update item
            # Example: <h3>Feature</h3> <p>...</p> <h3>Issue</h3> <p>...</p>
            pattern = re.compile(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', re.DOTALL | re.IGNORECASE)
            matches = pattern.findall(content_html)
            
            if not matches:
                # Fallback if no H3 elements are present
                updates.append({
                    'id': f"update-{index}-0",
                    'date': date_str,
                    'link': full_link,
                    'type': 'Update',
                    'description': content_html.strip()
                })
            else:
                for sub_index, match in enumerate(matches):
                    item_type = match[0].strip()
                    item_desc = match[1].strip()
                    updates.append({
                        'id': f"update-{index}-{sub_index}",
                        'date': date_str,
                        'link': full_link,
                        'type': item_type,
                        'description': item_desc
                    })
                    
        return updates, None
    except Exception as e:
        return [], str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def releases():
    updates, error = fetch_and_parse_feed()
    if error:
        return jsonify({'error': error, 'releases': []}), 500
    return jsonify({'error': None, 'releases': updates})

if __name__ == '__main__':
    # Run locally on port 5005
    app.run(host='127.0.0.1', port=5005, debug=True)
