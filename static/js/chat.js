document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const messagesContainer = document.getElementById('messages-container');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-btn');
    const newChatButton = document.getElementById('new-chat-btn');
    const toggleSidebarButton = document.getElementById('toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    const suggestionChips = document.querySelectorAll('.suggestion-chip');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    
    // Chat state
    let currentChatId;
    
    // Initialize chat
    function init() {
        // Load chat history or create new chat
        const chats = getAllChatsFromStorage();
        if (Object.keys(chats).length > 0) {
            // Load the most recent chat
            const sortedChatIds = Object.keys(chats).sort((a, b) => {
                const aTimestamp = parseInt(a.split('_')[1]);
                const bTimestamp = parseInt(b.split('_')[1]);
                return bTimestamp - aTimestamp;
            });
            
            currentChatId = sortedChatIds[0];
            loadChat(currentChatId);
        } else {
            // Create a new chat if none exists
            currentChatId = createNewChat();
            displayWelcomeMessage();
        }
    }
    
    // Event Listeners
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    newChatButton.addEventListener('click', function() {
        currentChatId = createNewChat();
        clearMessages();
        displayWelcomeMessage();
        // Close sidebar on mobile after creating new chat
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }
    });
    
    toggleSidebarButton.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('active');
        }
    });
    
    // Handle mobile sidebar close when clicking outside
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && 
            !sidebar.contains(e.target) && 
            !mobileMenuToggle.contains(e.target) &&
            sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });
    
    // Initialize suggestion chips
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', function() {
            messageInput.value = this.dataset.message;
            sendMessage();
        });
    });
    
    // Initialize chat history
    loadChatHistory();
    
    // Auto-resize text area as user types
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    /**
     * Sends the user message to the server and displays the response
     */
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;
        
        const timestamp = new Date().toISOString();
        
        // Display user message
        addMessageToUI(message, 'user', timestamp);
        
        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Save to chat history
        saveMessageToHistory(currentChatId, {
            text: message,
            sender: 'user',
            timestamp: timestamp
        });
        
        // Show typing indicator
        showTypingIndicator();
        
        // Send to server and get response
        fetch('/send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                timestamp: timestamp
            })
        })
        .then(response => response.json())
        .then(data => {
            // Hide typing indicator
            hideTypingIndicator();
            
            // Display bot response
            addMessageToUI(data.text, 'bot', data.timestamp);
            
            // Save bot response to history
            saveMessageToHistory(currentChatId, {
                text: data.text,
                sender: 'bot',
                timestamp: data.timestamp
            });
            
            // Update title based on first exchange
            updateChatTitleBasedOnExchange();
        })
        .catch(error => {
            console.error('Error:', error);
            hideTypingIndicator();
            addMessageToUI('Sorry, there was an error processing your request. Please try again.', 'bot', new Date().toISOString());
        });
    }
    
    /**
     * Creates a new chat session
     */
    function createNewChat() {
        const chatId = 'chat_' + Date.now();
        const chatTitle = 'New Chat';
        
        // Save to storage
        saveChatToStorage(chatId, chatTitle);
        
        // Update UI
        updateChatHistoryUI();
        
        return chatId;
    }
    
    /**
     * Updates the chat title based on the first exchange
     */
    function updateChatTitleBasedOnExchange() {
        const messages = getMessagesFromStorage(currentChatId);
        if (messages.length >= 2) {
            const firstUserMsg = messages.find(m => m.sender === 'user');
            if (firstUserMsg) {
                const title = firstUserMsg.text.length > 25 ? 
                    firstUserMsg.text.substring(0, 25) + '...' : 
                    firstUserMsg.text;
                
                updateChatTitleInStorage(currentChatId, title);
                updateChatHistoryUI();
            }
        }
    }
    
    /**
     * Adds a message to the UI
     */
    function addMessageToUI(text, sender, timestamp) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `message-${sender}`);
        
        const date = new Date(timestamp);
        const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const senderIcon = sender === 'bot' ? 
            '<i class="fas fa-tools me-2"></i>' : 
            '<i class="fas fa-user me-2"></i>';
        
        messageDiv.innerHTML = `
            <div class="message-content">${senderIcon}${formatMessageText(text)}</div>
            <div class="message-timestamp">${formattedTime}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    /**
     * Formats message text with line breaks and links
     */
    function formatMessageText(text) {
        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        text = text.replace(urlRegex, url => `<a href="${url}" target="_blank">${url}</a>`);
        
        // Convert line breaks to <br>
        return text.replace(/\n/g, '<br>');
    }
    
    /**
     * Shows a typing indicator
     */
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.classList.add('message', 'message-bot');
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    /**
     * Hides the typing indicator
     */
    function hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    /**
     * Clears all messages from the UI
     */
    function clearMessages() {
        messagesContainer.innerHTML = '';
    }
    
    /**
     * Displays the welcome message
     */
    function displayWelcomeMessage() {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.classList.add('welcome-message');
        welcomeDiv.innerHTML = `
            <h2><i class="fas fa-leaf me-2"></i>Welcome to the DIY Guide!</h2>
            <p>Ask me anything about DIY projects for spring and summer. I'm here to help with your creative gardening and home ideas!</p>
            <div class="suggestion-chips">
                <button class="suggestion-chip" data-message="How do I start a spring herb garden?">
                    <i class="fas fa-seedling me-1"></i> How do I start a spring herb garden?
                </button>
                <button class="suggestion-chip" data-message="Simple garden crafts for kids">
                    <i class="fas fa-child me-1"></i> Simple garden crafts for kids
                </button>
                <button class="suggestion-chip" data-message="DIY spring party decorations">
                    <i class="fas fa-birthday-cake me-1"></i> DIY spring party decorations
                </button>
                <button class="suggestion-chip" data-message="Sustainable gardening projects">
                    <i class="fas fa-recycle me-1"></i> Sustainable gardening projects
                </button>
            </div>
        `;
        
        messagesContainer.appendChild(welcomeDiv);
        
        // Re-attach event listeners to suggestion chips
        welcomeDiv.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', function() {
                messageInput.value = this.dataset.message;
                sendMessage();
            });
        });
    }
    
    /**
     * Loads chat history from storage and updates UI
     */
    function loadChatHistory() {
        updateChatHistoryUI();
        
        // If there are existing chats, load the most recent one
        const chats = getAllChatsFromStorage();
        if (Object.keys(chats).length > 0) {
            // Sort chats by timestamp (newest first)
            const sortedChatIds = Object.keys(chats).sort((a, b) => {
                const aTimestamp = parseInt(a.split('_')[1]);
                const bTimestamp = parseInt(b.split('_')[1]);
                return bTimestamp - aTimestamp;
            });
            
            currentChatId = sortedChatIds[0];
            loadChat(currentChatId);
        } else {
            // If no chats exist, display welcome message
            currentChatId = createNewChat();
            displayWelcomeMessage();
        }
    }
    
    /**
     * Updates the chat history UI based on storage
     */
    function updateChatHistoryUI() {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        
        const chats = getAllChatsFromStorage();
        
        // Sort chats by timestamp (newest first)
        const sortedChatIds = Object.keys(chats).sort((a, b) => {
            const aTimestamp = parseInt(a.split('_')[1]);
            const bTimestamp = parseInt(b.split('_')[1]);
            return bTimestamp - aTimestamp;
        });
        
        if (sortedChatIds.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'dropdown-item text-center text-muted';
            emptyItem.textContent = 'No chat history yet';
            historyList.appendChild(emptyItem);
            return;
        }
        
        sortedChatIds.forEach(chatId => {
            const chat = chats[chatId];
            const li = document.createElement('li');
            li.classList.add('history-item');
            li.dataset.chatId = chatId;
            
            // Add active class for current chat
            if (chatId === currentChatId) {
                li.classList.add('active');
            }
            
            li.innerHTML = `
                <span class="history-item-title">${chat.title}</span>
                <span class="history-item-delete"><i class="fas fa-trash"></i></span>
            `;
            
            li.querySelector('.history-item-title').addEventListener('click', function() {
                currentChatId = chatId;
                loadChat(chatId);
                
                // Close sidebar on mobile after selecting chat
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                }
            });
            
            li.querySelector('.history-item-delete').addEventListener('click', function(e) {
                e.stopPropagation();
                
                // Confirm before deleting
                if (confirm('Are you sure you want to delete this chat?')) {
                    deleteChatFromStorage(chatId);
                    updateChatHistoryUI();
                    
                    // If we deleted the current chat, create a new one
                    if (chatId === currentChatId) {
                        currentChatId = createNewChat();
                        clearMessages();
                        displayWelcomeMessage();
                    }
                }
            });
            
            historyList.appendChild(li);
        });
    }
    
    /**
     * Loads a chat from storage and displays it
     */
    function loadChat(chatId) {
        clearMessages();
        
        const messages = getMessagesFromStorage(chatId);
        
        if (messages.length === 0) {
            displayWelcomeMessage();
            return;
        }
        
        messages.forEach(msg => {
            addMessageToUI(msg.text, msg.sender, msg.timestamp);
        });
    }
    
    // Focus on input field when page loads
    setTimeout(() => {
        messageInput.focus();
    }, 500);
    
    // Initialize the chat
    init();
});
