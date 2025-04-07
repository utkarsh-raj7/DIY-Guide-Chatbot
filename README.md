# MemoryMage

A DIY Guide chatbot powered by Google Gemini with memory management that maintains context between chat sessions.

## Features

- Interactive chat interface with a spring theme
- Text-to-Speech capabilities
- Voice recording and speech recognition
- Multi-session memory management
- Context rebuilding for persistent conversations

## Deploying to Render

### Preparing for Deployment

Before deploying, it's recommended to clean up cached files to minimize deployment size:

```bash
# Remove Python cache files
find . -type d -name "__pycache__" -exec rm -rf {} +
find . -name "*.pyc" -delete

# Clean up any other temporary files
rm -rf .uv .pytest_cache .coverage htmlcov
```

This helps reduce deployment time and ensures a cleaner production environment.

### Manual Deployment

1. Create a new Web Service on Render
2. Link your GitHub repository
3. Configure the deployment:
   - **Name**: memory-mage (or your preferred name)
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn -w 4 -b 0.0.0.0:$PORT wsgi:app`
4. Add the following environment variable:
   - `GEMINI_API_KEY` = Your Google Gemini API key

### Blueprint Deployment (Recommended)

1. Make sure your repository contains the `render.yaml` file
2. Go to the Render Dashboard and click "Blueprint"
3. Connect your GitHub repository
4. Render will detect the `render.yaml` file and configure everything automatically
5. You'll be prompted to enter your `GEMINI_API_KEY`
6. Click "Apply" and Render will deploy your application

## Local Development

1. Clone the repository
2. Create a `.env` file with your `GEMINI_API_KEY`
3. Install dependencies: `pip install -r requirements.txt`
4. Run the application: `python main.py`
5. Access the application at `http://localhost:5001`
