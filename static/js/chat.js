document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const messagesContainer = document.getElementById('messages-container');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const historyList = document.getElementById('history-list');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const toggleSidebarReturnBtn = document.getElementById('toggle-sidebar-return');
    const sidebar = document.getElementById('sidebar');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    
    // Initialize variables
    let currentChatId = null;
    let isTyping = false;
    let isFirstMessage = true;
    
    // Event Listeners
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (messageInput) messageInput.addEventListener('keypress', handleKeyPress);
    if (newChatBtn) newChatBtn.addEventListener('click', createNewChat);
    if (toggleSidebarBtn) toggleSidebarBtn.addEventListener('click', toggleSidebar);
    if (toggleSidebarReturnBtn) toggleSidebarReturnBtn.addEventListener('click', toggleSidebar);
    if (mobileMenuToggle) mobileMenuToggle.addEventListener('click', toggleMobileSidebar);
    
    // Initialize
    init();
    
    // Add suggestion chip click handlers
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const message = this.getAttribute('data-message');
            if (messageInput) {
                messageInput.value = message;
                sendMessage();
            }
        });
    });
    
    // TTS Integration 
    const synth = window.speechSynthesis;
    
    // Create a MutationObserver to watch for new bot messages
    if (messagesContainer) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check each added node to see if it's a bot message
                    mutation.addedNodes.forEach(function(node) {
                        if (node.classList && node.classList.contains('message-bot') && window.ttsEnabled) {
                            // Get the text content and speak it
                            const messageContent = node.querySelector('.message-content');
                            if (messageContent) {
                                speakText(messageContent.textContent);
                            }
                        }
                    });
                }
            });
        });
        
        // Start observing the messages container with the configured parameters
        observer.observe(messagesContainer, { childList: true, subtree: true });
    }
    
    // Function to speak text
    window.speakText = function(text) {
        // Cancel any ongoing speech
        synth.cancel();
        
        // Create a new utterance
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Speak the text
        synth.speak(utterance);
    };
    
    /**
     * Initialize the chat interface
     */
    function init() {
        // Initialize chat history from storage
        loadChatHistory();
        
        // Create a new chat if there's no active chat
        if (!currentChatId) {
            createNewChat(false);
        }
        
        // Initialize autosize for textarea
        if (messageInput) {
            messageInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
                
                // Cap maximum height
                if (this.scrollHeight > 150) {
                    this.style.height = '150px';
                    this.style.overflowY = 'auto';
                } else {
                    this.style.overflowY = 'hidden';
                }
            });
        }
        
        // Attach click handler to message copy buttons (delegated)
        if (messagesContainer) {
            messagesContainer.addEventListener('click', function(e) {
                if (e.target.classList.contains('copy-btn') || e.target.closest('.copy-btn')) {
                    const button = e.target.classList.contains('copy-btn') ? e.target : e.target.closest('.copy-btn');
                    const messageEl = button.closest('.message');
                    if (messageEl) {
                        const contentEl = messageEl.querySelector('.message-content');
                        if (contentEl) {
                            copyMessageToClipboard(contentEl.textContent);
                        }
                    }
                }
            });
        }
    }
    
    /**
     * Function to copy message text to clipboard
     */
    function copyMessageToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => {
                showCopyFeedback();
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
            });
    }
    
    /**
     * Shows a brief success message when a message is copied
     */
    function showCopyFeedback() {
        const feedback = document.createElement('div');
        feedback.className = 'copy-feedback';
        feedback.textContent = 'Copied to clipboard!';
        
        document.body.appendChild(feedback);
        
        // Add styles
        feedback.style.position = 'fixed';
        feedback.style.bottom = '20px';
        feedback.style.left = '50%';
        feedback.style.transform = 'translateX(-50%)';
        feedback.style.padding = '8px 16px';
        feedback.style.backgroundColor = 'var(--spring-moss)';
        feedback.style.color = 'white';
        feedback.style.borderRadius = '8px';
        feedback.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
        feedback.style.zIndex = '1000';
        feedback.style.opacity = '0';
        feedback.style.transition = 'opacity 0.3s ease';
        
        // Animate in
        setTimeout(() => {
            feedback.style.opacity = '1';
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            feedback.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(feedback);
            }, 300);
        }, 2000);
    }
    
    /**
     * Handles the Enter key in the message input
     */
    function handleKeyPress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }
    
    /**
     * Sends the user message to the server and displays the response
     */
    function sendMessage() {
        const message = messageInput.value.trim();
        
        if (!message) return;
        
        // Add the message to the UI
        addMessageToUI(message, 'user');
        
        // Clear the input field
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Reset the textarea size
        messageInput.style.height = 'auto';
        
        // Show typing indicator
        showTypingIndicator();
        
        // Create a new chat if this is the first message
        if (isFirstMessage) {
            // If this is the first message, start a chat session
            fetch('/start_chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: currentChatId
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    isFirstMessage = false;
                    sendMessageToServer(message);
                } else {
                    hideTypingIndicator();
                    console.error('Failed to create chat session:', data.message);
                    addMessageToUI('Sorry, I encountered an error creating a new chat session. Please try again.', 'bot');
                }
            })
            .catch(error => {
                hideTypingIndicator();
                console.error('Error creating chat session:', error);
                addMessageToUI('Sorry, I encountered an error creating a new chat session. Please try again.', 'bot');
            });
        } else {
            // Otherwise, just send the message
            sendMessageToServer(message);
        }
        
        // Save this message to the chat history
        saveMessageToHistory(currentChatId, {
            text: message,
            sender: 'user'
        });
        
        // Update chat title if needed
        if (isFirstMessage) {
            updateChatTitleBasedOnExchange(message);
        }
    }
    
    /**
     * Sends the message to the server and handles the response
     */
    function sendMessageToServer(message) {
        fetch('/send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                chat_id: currentChatId
            })
        })
        .then(response => response.json())
        .then(data => {
            // Hide typing indicator
            hideTypingIndicator();
            
            // Add the bot response to the UI
            addMessageToUI(data.text, 'bot');
            
            // Save the bot response to chat history
            saveMessageToHistory(currentChatId, {
                text: data.text,
                sender: 'bot'
            });
            
            // Update chat title if needed
            if (isFirstMessage) {
                updateChatTitleBasedOnExchange(message, data.text);
                isFirstMessage = false;
            }
        })
        .catch(error => {
            // Hide typing indicator
            hideTypingIndicator();
            
            console.error('Error sending message:', error);
            addMessageToUI('Sorry, I encountered an error. Please try again.', 'bot');
        });
    }
    
    /**
     * Creates a new chat session
     */
    function createNewChat(switchToNewChat = true) {
        // Generate a unique ID for this chat
        const chatId = 'chat_' + Date.now();
        
        // Generate a placeholder title
        const title = 'New Chat';
        
        // Save the chat to storage
        saveChatToStorage(chatId, title);
        
        // Reset the UI
        if (switchToNewChat) {
            clearMessages();
            displayWelcomeMessage();
            
            // Update the current chat ID
            currentChatId = chatId;
            
            // Reset first message flag
            isFirstMessage = true;
            
            // Update chat history UI
            updateChatHistoryUI();
        } else {
            // Just set the current chat ID
            currentChatId = chatId;
        }
    }
    
    /**
     * Updates the chat title based on the first exchange
     */
    function updateChatTitleBasedOnExchange(userMessage, botResponse) {
        // For now, just use the first few words of the user message as the title
        let title = userMessage.split(' ').slice(0, 5).join(' ');
        
        // Add ellipsis if the message is longer
        if (userMessage.split(' ').length > 5) {
            title += '...';
        }
        
        // Update the chat title in storage
        updateChatTitleInStorage(currentChatId, title);
        
        // Update the UI
        updateChatHistoryUI();
    }
    
    /**
     * Adds a message to the UI
     */
    function addMessageToUI(text, sender) {
        // Format the current time for display
        const formattedTime = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Create the message element
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${sender}`;
        
        let avatarIcon = '<i class="fas fa-user"></i>';
        if (sender === 'bot') {
            avatarIcon = '<i class="fas fa-leaf"></i>';
        }
        
        const formattedText = formatMessageText(text);
        
        messageEl.innerHTML = `
            <div class="message-avatar">
                ${avatarIcon}
            </div>
            <div class="message-bubble">
                <div class="message-content">${formattedText}</div>
                <div class="message-footer">
                    ${sender === 'bot' ? '<button class="copy-btn" title="Copy message"><i class="fas fa-copy"></i></button>' : ''}
                </div>
            </div>
        `;
        
        // Add to the messages container
        messagesContainer.appendChild(messageEl);
        
        // Scroll to the bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    /**
     * Formats message text with line breaks and links
     */
    function formatMessageText(text) {
        // If text already contains HTML tags, assume it's already formatted
        if (text.includes('<p>') || text.includes('<div>') || text.includes('<span>')) {
            return text;
        }
        
        // Otherwise, add basic formatting
        // - Replace URLs with clickable links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        text = text.replace(urlRegex, function(url) {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
        
        // - Replace line breaks with <br> tags
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }
    
    /**
     * Shows a typing indicator
     */
    function showTypingIndicator() {
        // Check if a typing indicator already exists
        if (isTyping) return;
        
        isTyping = true;
        
        // Create the indicator element
        const indicatorEl = document.createElement('div');
        indicatorEl.className = 'message message-bot typing-indicator';
        indicatorEl.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-leaf"></i>
            </div>
            <div class="message-bubble">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        // Add to the messages container
        messagesContainer.appendChild(indicatorEl);
        
        // Scroll to the bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    /**
     * Hides the typing indicator
     */
    function hideTypingIndicator() {
        // Find and remove the typing indicator
        const indicator = document.querySelector('.typing-indicator');
        if (indicator) {
            indicator.remove();
        }
        
        isTyping = false;
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
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'welcome-message';
        welcomeMessage.innerHTML = `
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
        
        // Add to the messages container
        messagesContainer.appendChild(welcomeMessage);
        
        // Add suggestion chip click handlers
        welcomeMessage.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', function() {
                const message = this.getAttribute('data-message');
                if (messageInput) {
                    messageInput.value = message;
                    sendMessage();
                }
            });
        });
    }
    
    /**
     * Loads chat history from storage and updates UI
     */
    function loadChatHistory() {
        const chats = getAllChatsFromStorage();
        
        // Get the most recent chat
        let mostRecentChat = null;
        let mostRecentTime = 0;
        
        for (const chatId in chats) {
            const chatTimestamp = parseInt(chatId.split('_')[1] || '0');
            if (chatTimestamp > mostRecentTime) {
                mostRecentTime = chatTimestamp;
                mostRecentChat = chatId;
            }
        }
        
        // Set the current chat ID
        if (mostRecentChat) {
            currentChatId = mostRecentChat;
            
            // Load the messages for this chat
            loadChat(mostRecentChat);
        }
        
        // Update the chat history UI
        updateChatHistoryUI();
    }
    
    /**
     * Updates the chat history UI based on storage
     */
    function updateChatHistoryUI() {
        // Clear the history list
        historyList.innerHTML = '';
        
        // Get all chats from storage
        const chats = getAllChatsFromStorage();
        
        // Add each chat to the history list
        for (const chatId in chats) {
            const chat = chats[chatId];
            
            // Create the list item
            const listItem = document.createElement('li');
            
            // Create the link
            const link = document.createElement('a');
            link.className = 'dropdown-item chat-history-item';
            link.href = '#';
            link.textContent = chat.title;
            
            // Add active class if this is the current chat
            if (chatId === currentChatId) {
                link.classList.add('active');
            }
            
            // Add click handler
            link.addEventListener('click', function(e) {
                e.preventDefault();
                loadChat(chatId);
            });
            
            // Add the link to the list item
            listItem.appendChild(link);
            
            // Add the list item to the history list
            historyList.appendChild(listItem);
        }
    }
    
    /**
     * Loads a chat from storage and displays it
     */
    function loadChat(chatId) {
        // Update the current chat ID
        currentChatId = chatId;
        
        // Clear the UI
        clearMessages();
        
        // Get the messages for this chat
        const messages = getMessagesFromStorage(chatId);
        
        // Check if we have messages
        if (messages && messages.length > 0) {
            // Add each message to the UI
            messages.forEach(message => {
                addMessageToUI(message.text, message.sender);
            });
            
            // Set firstMessage flag (false if we have messages)
            isFirstMessage = false;
        } else {
            // Display the welcome message
            displayWelcomeMessage();
            
            // Set firstMessage flag
            isFirstMessage = true;
        }
        
        // Update the chat history UI
        updateChatHistoryUI();
    }
    
    /**
     * Toggles the sidebar
     */
    function toggleSidebar() {
        sidebar.classList.toggle('sidebar-collapsed');
        document.querySelector('.main-content').classList.toggle('expanded');
    }
    
    /**
     * Toggles the mobile sidebar
     */
    function toggleMobileSidebar() {
        sidebar.classList.toggle('mobile-visible');
    }
});
