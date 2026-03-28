import gspread
import spotipy
from dotenv import load_dotenv 
import os
from spotipy.oauth2 import SpotifyOAuth
from flask import Flask, jsonify, render_template
from rapidfuzz import fuzz
import re

load_dotenv()  # Load environment variables from .env file

app = Flask(__name__)

# --- 1. CONFIGURATION (Fill these in!) ---
GOOGLE_JSON_FILE = 'google_service_account.json'
SHEET_NAME = os.getenv('GOOGLE_SHEET_ID', 'Spotify Contributions')

SPOTIFY_CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID', '')
SPOTIFY_CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET', '')
SPOTIFY_REFRESH_TOKEN = os.getenv('SPOTIFY_REFRESH_TOKEN', '')
# Redirect URI must match what you put in the Spotify Developer Dashboard
REDIRECT_URI = os.getenv('SPOTIFY_REDIRECT_URI', '')

ACT_COL_NAMES = [
    "Act 1 Song submission (Song title - Artist)",
    "Act 2 Song submission (Song title - Artist)",
    "Act 3 Song submission (Song title - Artist)"
]

# --- 2. AUTHENTICATION SETUP ---

# Spotify Setup
sp_oauth = SpotifyOAuth(
    client_id=SPOTIFY_CLIENT_ID,
    client_secret=SPOTIFY_CLIENT_SECRET,
    redirect_uri=REDIRECT_URI
)

# This function gets a fresh access token using your refresh token
def get_spotify_client():
    token_info = sp_oauth.refresh_access_token(SPOTIFY_REFRESH_TOKEN)
    return spotipy.Spotify(auth=token_info['access_token'])

# Google Sheets Setup
gc = gspread.service_account(filename=GOOGLE_JSON_FILE)
sh = gc.open_by_key(os.environ.get('GOOGLE_SHEET_ID')).sheet1
# We cache the data so we don't hit Google's rate limits every 3 seconds
cached_sheet_data = sh.get_all_records(head=1)

# --- 3. THE LOGIC ---

def find_contributor(song_name, artist_name):
    """
    Uses fuzzy matching to find who added the song to the Google Sheet.
    """
    current_playing_str = f"{song_name} - {artist_name}".lower()
    
    best_match_name = "Guest Choice"
    highest_score = 0
    
    for row in cached_sheet_data:
        person_name = row.get('Name', 'Unknown')
        # Check Act I, Act II, and Act III columns
        for col in ACT_COL_NAMES:
            sheet_song = str(row.get(col, "")).lower()
            if not sheet_song: continue
            
            # token_set_ratio is great for "Song - Artist" vs "Song (feat. X) - Artist"
            score = fuzz.token_set_ratio(current_playing_str, sheet_song)
            
            if score > 50 and score > highest_score:
                highest_score = score
                best_match_name = person_name
                
    return best_match_name

# --- 4. THE ROUTES (The API) ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/now-playing')
def now_playing():
    try:
        sp = get_spotify_client()
        current = sp.currently_playing()
        
        if not current or not current['item']:
            return jsonify({"status": "idle", "message": "Nothing playing"})

        track = current['item']['name']
        artist = current['item']['artists'][0]['name']

        # album art: Spotify returns a list of images for the album (different sizes).
        # Choose the first image if available (usually the largest).
        album = current['item'].get('album', {}) if isinstance(current['item'], dict) else {}
        images = album.get('images', []) if isinstance(album, dict) else []
        album_art = None
        if images and isinstance(images, list):
            # images are usually ordered from largest -> smallest
            try:
                album_art = images[0].get('url') if isinstance(images[0], dict) else None
            except Exception:
                album_art = None

        contributor = find_contributor(track, artist)

        return jsonify({
            "status": "playing",
            "track": track,
            "artist": artist,
            "contributor": contributor,
            "album_art": album_art
        })
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/refresh-sheet')
def refresh_sheet():
    """Route to manually refresh the Google Sheet data without restarting Python."""
    global cached_sheet_data
    cached_sheet_data = sh.get_all_records()
    return jsonify({"status": "success", "message": "Sheet data reloaded"})

@app.route('/api/play-act/<act_num>')
def play_act(act_num):
    # Mapping the number to the ID in your .env
    playlist_map = {
        '1': os.getenv('ACT1_ID'),
        '2': os.getenv('ACT2_ID'),
        '3': os.getenv('ACT3_ID')
    }
    
    playlist_id = playlist_map.get(act_num)
    
    if not playlist_id:
        return jsonify({"status": "error", "message": "Invalid Act Number"}), 400

    try:
        sp = get_spotify_client() # Using your existing refresh token function
        # Spotify needs the "URI" format: spotify:playlist:ID
        uri = f"spotify:playlist:{playlist_id}"
        
        # This command starts the playlist
        sp.start_playback(context_uri=uri)
        return jsonify({"status": "success", "act": act_num})
    except Exception as e:
        # Usually happens if no Spotify device is "active"
        return jsonify({"status": "error", "message": str(e)}), 500
    
if __name__ == '__main__':
    # Running on http://127.0.0.1:5000
    app.run(debug=True, port=5000)