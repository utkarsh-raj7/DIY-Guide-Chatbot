import os
from flask import Flask, render_template, request, jsonify
from werkzeug.middleware.proxy_fix import ProxyFix
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create the Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key_for_development")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

@app.route('/')
def index():
    """Render the main page of the application."""
    return render_template('index.html')

@app.route('/send_message', methods=['POST'])
def send_message():
    """
    Process a message sent by the user.
    
    This is a simple demo version that doesn't require the Gemini API.
    In production, this would call the code1.py module.
    """
    user_message = request.json.get('message', '')
    timestamp = request.json.get('timestamp')
    
    # For demo purposes, just echo back a simple response
    response = {
        'text': f"<p>Thanks for your question about <strong>{user_message}</strong>!</p><p>Here's a spring DIY project idea: Create a hanging herb garden using recycled containers. Start with small plastic bottles or jars, decorate them with eco-friendly paint, and hang them in a sunny window.</p><p><strong>Materials needed:</strong></p><ul><li>Recycled containers</li><li>String or wire for hanging</li><li>Soil</li><li>Herb seeds or seedlings</li><li>Decorative paint (optional)</li></ul><p>This is a easy project that takes about 2 hours to complete.</p>",
        'timestamp': timestamp
    }
    
    return jsonify(response)

@app.route('/save_audio', methods=['POST'])
def save_audio():
    """
    Process audio data sent from the client.
    
    This is a simple demo that returns a mock transcription.
    In production, this would use a speech-to-text service.
    """
    return jsonify({
        'status': 'success',
        'message': 'Audio received successfully',
        'transcription': "I'm interested in DIY spring gardening projects.",
    })

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
