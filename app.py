import os
import logging
import tempfile
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
    """Create a new chat session or validate an existing one."""
    try:
        # Generate a unique chat ID
        chat_id = request.json.get('chat_id', f"chat_{datetime.now().timestamp()}")
        
        # Check if this chat session already exists
        chat_exists = chat_id in chat_sessions
        
        # Create a new chat session if it doesn't exist
        if not chat_exists:
            chat_sessions[chat_id] = start_chat_session()
            logger.info(f"Created new chat session: {chat_id}")
            message = 'Chat session created'
        else:
            logger.info(f"Using existing chat session: {chat_id}")
            message = 'Chat session exists'
        
        return jsonify({
            'status': 'success',
            'message': message,
            'chat_id': chat_id,
            'is_new': not chat_exists
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
        chat_history = request.json.get('chat_history', [])
        
        # Get or create the chat session
        if chat_id not in chat_sessions:
            logger.info(f"Creating new chat session for existing chat_id: {chat_id}")
            
            # Create a new chat session
            chat_sessions[chat_id] = start_chat_session(history=chat_history)
            
            if chat_history:
                logger.info(f"Rebuilding context from {len(chat_history)} messages natively")
        
        # Get the response from the model
        bot_response = get_bot_response(chat_sessions[chat_id], user_message)
        
        # Return the response
        return jsonify({
            'text': bot_response
        })
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        return jsonify({
            'text': "Sorry, I encountered an error processing your request. Please try again."
        })

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
                'status': 'error',
                'message': 'No audio file provided'
            }), 400
        
        audio_file = request.files['audio']
        
        # Save the file to a temporary location
        temp_dir = tempfile.gettempdir()
        temp_file_path = os.path.join(temp_dir, f"audio_{datetime.now().timestamp()}.wav")
        audio_file.save(temp_file_path)
        
        logger.debug(f"Audio saved to: {temp_file_path}")
        
        # For now, we'll return a placeholder transcription
        # In a real application, you would process this file with a speech-to-text service
        
        # Placeholder response - this would be replaced with actual STT implementation
        return jsonify({
            'status': 'success',
            'message': 'Audio received successfully',
            'transcription': "I'm interested in DIY spring gardening projects.",
            'audio_path': temp_file_path
        })
        
    except Exception as e:
        logger.error(f"Error saving audio: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to save audio: {str(e)}'
        }), 500

@app.route('/rebuild_context', methods=['POST'])
def rebuild_context():
    """Rebuild the context for a chat session using history from the client."""
    try:
        chat_id = request.json.get('chat_id', 'default')
        chat_history = request.json.get('chat_history', [])
        
        logger.info(f"Rebuilding context for chat_id: {chat_id}")
        
        # Create a new chat session with history if needed
        if chat_id not in chat_sessions:
            chat_sessions[chat_id] = start_chat_session(history=chat_history)
            if chat_history:
                logger.info(f"Rebuilt context natively with {len(chat_history)} messages")
        
        return jsonify({
            'status': 'success',
            'message': 'Context rebuilt successfully'
        })
    except Exception as e:
        logger.error(f"Error rebuilding context: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to rebuild context'
        }), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5001, debug=True)
