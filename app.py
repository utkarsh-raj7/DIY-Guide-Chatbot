import os
import logging
import tempfile
import base64
import json
from datetime import datetime

from flask import Flask, render_template, request, jsonify
from werkzeug.middleware.proxy_fix import ProxyFix

# Import our chatbot code
from code1 import start_chat_session, get_bot_response

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create the Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key_for_development")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Global chat session storage
chat_sessions = {}

@app.route('/')
def index():
    """Render the main page of the application."""
    return render_template('index.html')

@app.route('/start_chat', methods=['POST'])
def create_chat():
    """Create a new chat session."""
    try:
        # Generate a unique chat ID
        chat_id = request.json.get('chat_id', f"chat_{datetime.now().timestamp()}")
        
        # Create a new chat session
        chat_sessions[chat_id] = start_chat_session()
        
        return jsonify({
            'status': 'success',
            'message': 'Chat session created',
            'chat_id': chat_id
        })
    except Exception as e:
        logger.error(f"Error creating chat session: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to create chat session'
        }), 500

@app.route('/send_message', methods=['POST'])
def send_message():
    """Process a message sent by the user."""
    try:
        user_message = request.json.get('message', '')
        chat_id = request.json.get('chat_id', 'default')
        timestamp = request.json.get('timestamp')
        is_search = request.json.get('is_search', False)
        
        # Get or create the chat session
        if chat_id not in chat_sessions:
            chat_sessions[chat_id] = start_chat_session()
        
        # Get the response from the model
        bot_response = get_bot_response(chat_sessions[chat_id], user_message, force_search=is_search)
        
        # Return the response
        return jsonify({
            'text': bot_response,
            'timestamp': timestamp
        })
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        return jsonify({
            'text': "Sorry, I encountered an error processing your request. Please try again.",
            'timestamp': timestamp
        })

@app.route('/speech_to_text', methods=['POST'])
def speech_to_text():
    """
    Process audio data for speech-to-text conversion.
    
    Expects a base64-encoded audio file in the request.
    Returns the transcribed text.
    """
    try:
        # Get the audio data from the request
        audio_data = request.json.get('audio')
        
        if not audio_data:
            return jsonify({
                'status': 'error',
                'message': 'No audio data provided'
            }), 400
        
        # For now, we'll return a placeholder transcription
        # In a real application, you would use a speech-to-text service
        # For example: Google Cloud Speech-to-Text, Azure Speech Service, etc.
        
        # Placeholder response - this would be replaced with actual STT implementation
        return jsonify({
            'status': 'success',
            'transcription': "I'm interested in DIY spring gardening projects."
        })
        
    except Exception as e:
        logger.error(f"Error transcribing audio: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to transcribe audio: {str(e)}'
        }), 500

@app.route('/save_audio', methods=['POST'])
def save_audio():
    """
    Save audio data sent from the client and process it for speech-to-text.
    
    This endpoint handles the file upload directly from a FormData object.
    """
    try:
        # Check if the request has a file
        if 'audio' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No audio file provided'
            }), 400
        
        audio_file = request.files['audio']
        
        # Save the file to a temporary location
        temp_dir = tempfile.gettempdir()
        temp_file_path = os.path.join(temp_dir, f"audio_{datetime.now().timestamp()}.webm")
        audio_file.save(temp_file_path)
        
        logger.debug(f"Audio saved to: {temp_file_path}")
        
        # In a real application, you would process this file with a speech-to-text service
        # For now, we'll use a realistic example response for testing
        
        # In production, you would use a service like:
        # - Google Cloud Speech-to-Text
        # - Azure Speech Services
        # - Whisper API
        
        # Generate a dummy response based on common DIY topics
        example_texts = [
            "How do I start a spring herb garden?",
            "What are some easy DIY spring decoration ideas?",
            "Can you suggest sustainable gardening projects?",
            "I want to build a bird feeder for my garden",
            "How to make natural plant fertilizers at home?"
        ]
        
        import random
        transcribed_text = random.choice(example_texts)
        
        return jsonify({
            'success': True,
            'message': 'Audio received successfully',
            'text': transcribed_text
        })
        
    except Exception as e:
        logger.error(f"Error saving audio: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to save audio: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
