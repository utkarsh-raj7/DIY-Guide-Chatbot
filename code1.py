import google.generativeai as genai
import os
from dotenv import load_dotenv # Optional: for loading API key from .env file
import markdown
import re
from websearch import search_web, format_results


# --- Configuration ---
# Load environment variables (optional, recommended for API key)
# Create a .env file in the same directory with: GOOGLE_API_KEY=YOUR_API_KEY
load_dotenv() 
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("Error: GOOGLE_API_KEY not found.")
    print("Please set the GOOGLE_API_KEY environment variable or place it in a .env file.")
    exit() # Exit if the API key is not configured

genai.configure(api_key=API_KEY)

# --- Domain Definition (Crucial!) ---
# CHANGE THIS to your chosen specific domain
DOMAIN_CONTEXT = """You are a helpful chatbot assistant specializing in DIY projects for spring and summer, including simple craft projects, gardening, home decoration, and outdoor activities using common household items. 

Your answers should be:
1. Specific and detailed with clear step-by-step instructions
2. Focus on projects using accessible materials
3. Include safety considerations when appropriate
4. Mention approximate time requirements and difficulty level
5. Suggest seasonal variations when applicable

For complex queries, please extract key search terms to help find external resources. Format these as "SEARCH_QUERY: [exact search phrase]" at the end of your response.

If the user asks for something completely outside this domain (like medical advice or financial planning), politely state that you specialize in DIY projects and cannot fulfill the request.
"""

# --- Model Setup ---
# Choose the appropriate Gemini model
# For text-based chat, 'gemini-1.5-flash' or 'gemini-pro' are good choices.
# 'gemini-1.5-flash' is often faster and cheaper.
model = genai.GenerativeModel('gemini-1.5-flash')

# --- Conversation Memory ---
# Simple list to store conversation history
# Each item could be a dictionary: {'role': 'user'/'model', 'parts': [text]}
# Or manage history directly within the chat session object
# For simplicity here, we'll use the chat session feature which handles history

def start_chat_session():
    """Starts a new chat session with the initial domain context."""
    # The history starts with the system instruction defining the bot's role
    initial_history = [
        {'role': 'user', 'parts': ["Understood. I will act as a DIY project guide for spring and summer."]}, # Priming the model slightly
        {'role': 'model', 'parts': [DOMAIN_CONTEXT]} 
    ]
    # Start a chat session which maintains history automatically
    chat = model.start_chat(history=initial_history) 
    return chat

def extract_search_query(text):
    """Extract search query from model response if present"""
    search_pattern = r"SEARCH_QUERY:\s*(.+?)(?:$|\n)"
    match = re.search(search_pattern, text)
    if match:
        return match.group(1).strip()
    return None

def get_web_search_results(query):
    """Get web search results for a query"""
    if not query:
        return ""
    
    try:
        results = search_web(query)
        if results:
            formatted = format_results(results)
            return f"\n\n**Related DIY Project Resources:**\n{formatted}"
        return ""
    except Exception as e:
        print(f"Error performing web search: {e}")
        return ""

def get_bot_response(chat_session, user_prompt):
    """
    Sends the user prompt to the Gemini API using the chat session 
    and returns the bot's response with optional web search results.
    """
    try:
        # First, check if this is a query that would benefit from web search
        should_search = any(term in user_prompt.lower() for term in 
                           ['how to', 'guide', 'tutorial', 'instructions', 'diy', 'make', 'create'])
        
        # Extract direct search terms from the user prompt
        direct_search_query = None
        if should_search:
            direct_search_query = user_prompt
        
        # Send the message - the chat session automatically includes history
        response = chat_session.send_message(user_prompt)
        # Extract the text response
        bot_text = response.text
        
        # Extract search query if present in model response
        search_query = extract_search_query(bot_text)
        
        # Clean up the bot response by removing the search query directive
        if search_query:
            bot_text = re.sub(r"SEARCH_QUERY:\s*.+?(?:$|\n)", "", bot_text).strip()
        
        # Determine which search query to use (prioritize model's suggestion)
        final_search_query = search_query or direct_search_query
            
        # Get web search results if we have a query
        search_results = ""
        if final_search_query:
            # Add "DIY" or relevant context if not already in the query
            if "diy" not in final_search_query.lower() and "how to" not in final_search_query.lower():
                final_search_query = f"DIY {final_search_query}"
                
            results = search_web(final_search_query)
            if results:
                search_results = format_results(results)
                search_results = f"\n\n<div class='search-results-section'><h3>Related DIY Project Resources:</h3>{search_results}</div>"
        
        # Append search results to response
        if search_results:
            bot_text = f"{bot_text}{search_results}"
        
        # Convert markdown to HTML, but preserve HTML we added
        html_response = markdown.markdown(bot_text)
        
        # Make sure links open in new tabs
        html_response = html_response.replace('<a href=', '<a target="_blank" rel="noopener noreferrer" href=')
        
        return html_response
    
    except Exception as e:
        print(f"An error occurred while contacting the Gemini API: {e}")
        # You might want more sophisticated error handling here
        return "Sorry, I encountered an error. Please try again."

# --- Example Usage (Conceptual - will be integrated into UI below) ---
if __name__ == "__main__":
    print("Starting conceptual example...")
    
    # 1. Start a new chat
    my_chat = start_chat_session()
    print("Chat session started.")
    # Access history (optional viewing)
    # print("Initial History:", my_chat.history) 

    # 2. Simulate first user interaction
    user_input_1 = "How do I make a paper boat?"
    print(f"\nUser: {user_input_1}")
    bot_response_1 = get_bot_response(my_chat, user_input_1)
    print(f"Bot: {bot_response_1}")
    # print("History after 1st turn:", my_chat.history) # See how history is updated

    # 3. Simulate second user interaction (following up)
    user_input_2 = "What kind of paper works best?"
    print(f"\nUser: {user_input_2}")
    bot_response_2 = get_bot_response(my_chat, user_input_2)
    print(f"Bot: {bot_response_2}")
    # print("History after 2nd turn:", my_chat.history)

    # 4. Simulate out-of-domain request
    user_input_3 = "Can you give me a recipe for cookies?"
    print(f"\nUser: {user_input_3}")
    bot_response_3 = get_bot_response(my_chat, user_input_3)
    print(f"Bot: {bot_response_3}") # Should decline based on DOMAIN_CONTEXT
    
    print("\nConceptual example finished.")

