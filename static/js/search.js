/**
 * Web Search Functionality
 * Handles the context-based web search feature using Gemini API
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const webSearchBtn = document.getElementById('web-search-btn');
    const searchPopup = document.getElementById('search-popup');
    const searchOverlay = document.getElementById('search-overlay');
    const searchPopupClose = document.getElementById('search-popup-close');
    const searchForm = document.getElementById('search-form');
    const searchQueryInput = document.getElementById('search-query');
    const messagesContainer = document.getElementById('messages-container');
    
    // Event listeners
    webSearchBtn.addEventListener('click', handleWebSearchButtonClick);
    searchPopupClose.addEventListener('click', closeSearchPopup);
    searchOverlay.addEventListener('click', closeSearchPopup);
    searchForm.addEventListener('submit', handleSearchSubmit);
    
    /**
     * Handle web search button click
     * Gets context from recent messages and generates a search query
     */
    async function handleWebSearchButtonClick() {
        // Show loading state
        webSearchBtn.disabled = true;
        webSearchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        try {
            // Get recent messages for context
            const recentMessages = getRecentMessages();
            
            // Generate search query from context
            const generatedQuery = await generateSearchQuery(recentMessages);
            
            // Fill the search form
            searchQueryInput.value = generatedQuery;
            
            // Show the search popup
            showSearchPopup();
        } catch (error) {
            console.error('Error generating search query:', error);
            showToast('Could not generate search query', 'fas fa-exclamation-circle', '#d9534f');
        } finally {
            // Reset button state
            webSearchBtn.disabled = false;
            webSearchBtn.innerHTML = '<i class="fas fa-search"></i>';
        }
    }
    
    /**
     * Get recent messages from the chat for context
     * @returns {Array} Array of message objects with text and sender
     */
    function getRecentMessages() {
        const messageElements = document.querySelectorAll('.message');
        const recentMessages = [];
        
        // Get last 5 messages or all if less than 5
        const numMessages = Math.min(messageElements.length, 5);
        for (let i = messageElements.length - numMessages; i < messageElements.length; i++) {
            const element = messageElements[i];
            const isBot = element.classList.contains('message-bot');
            const text = element.querySelector('.message-text').textContent;
            
            recentMessages.push({
                text: text,
                sender: isBot ? 'bot' : 'user'
            });
        }
        
        return recentMessages;
    }
    
    /**
     * Generate a search query based on conversation context using the server
     * @param {Array} messages - Recent messages for context
     * @returns {Promise<string>} - Generated search query
     */
    async function generateSearchQuery(messages) {
        // Default query if no context or error
        if (!messages || messages.length === 0) {
            return "DIY projects ideas";
        }
        
        try {
            const response = await fetch('/generate_search_query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: messages })
            });
            
            if (!response.ok) {
                throw new Error('Server error generating query');
            }
            
            const data = await response.json();
            return data.query || "DIY projects ideas";
        } catch (error) {
            console.error('Error generating search query:', error);
            // Return a default query based on last user message
            const lastUserMessage = messages.findLast(m => m.sender === 'user');
            return lastUserMessage ? lastUserMessage.text : "DIY projects ideas";
        }
    }
    
    /**
     * Show the search popup
     */
    function showSearchPopup() {
        searchOverlay.classList.add('active');
        searchPopup.classList.add('active');
        searchQueryInput.focus();
    }
    
    /**
     * Close the search popup
     */
    function closeSearchPopup() {
        searchOverlay.classList.remove('active');
        searchPopup.classList.remove('active');
    }
    
    /**
     * Handle search form submission
     * @param {Event} e - Form submit event
     */
    async function handleSearchSubmit(e) {
        e.preventDefault();
        
        const query = searchQueryInput.value.trim();
        if (!query) {
            searchQueryInput.focus();
            return;
        }
        
        // Add user message about searching
        const searchMessage = `I'd like to search for: ${query}`;
        window.addMessageToUI(searchMessage, 'user', new Date().toISOString());
        
        // Close the popup
        closeSearchPopup();
        
        // Show typing indicator
        window.showTypingIndicator();
        
        try {
            // Send search request
            const response = await fetch('/web_search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query })
            });
            
            if (!response.ok) {
                throw new Error('Search failed');
            }
            
            const data = await response.json();
            
            // Hide typing indicator
            window.hideTypingIndicator();
            
            // Display search results
            window.addMessageToUI(data.response, 'bot', new Date().toISOString());
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (error) {
            console.error('Search error:', error);
            window.hideTypingIndicator();
            window.addMessageToUI("I'm sorry, I couldn't complete the web search at this time. Please try again later.", 'bot', new Date().toISOString());
        }
    }
    
    /**
     * Shows a toast notification
     * @param {string} message - Toast message text
     * @param {string} icon - Font Awesome icon class
     * @param {string} bgColor - Background color
     */
    function showToast(message, icon, bgColor) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.style.backgroundColor = bgColor;
        
        toast.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Trigger reflow for animation
        toast.offsetHeight;
        toast.classList.add('show');
        
        // Remove after animation
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
