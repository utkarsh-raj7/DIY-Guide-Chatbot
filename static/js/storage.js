/**
 * Storage Module for Chat History
 * 
 * Handles saving and retrieving chat data from localStorage
 */

// Constants
const CHAT_HISTORY_KEY = 'diy_guide_chat_history';
const MESSAGE_LIMIT_PER_CHAT = 100;
const CHAT_LIMIT = 20;

/**
 * Gets all chats from storage
 * @returns {Object} All saved chats
 */
function getAllChatsFromStorage() {
    const storedData = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!storedData) return {};
    
    try {
        return JSON.parse(storedData);
    } catch (error) {
        console.error('Error parsing chat history:', error);
        return {};
    }
}

/**
 * Saves a chat to storage
 * @param {string} chatId - Unique ID for the chat
 * @param {string} title - Display title for the chat
 */
function saveChatToStorage(chatId, title) {
    const chats = getAllChatsFromStorage();
    
    // Add new chat
    chats[chatId] = {
        title: title,
        createdAt: new Date().toISOString(),
        messages: []
    };
    
    // Limit number of chats
    const chatIds = Object.keys(chats);
    if (chatIds.length > CHAT_LIMIT) {
        // Sort by creation date (oldest first)
        chatIds.sort((a, b) => {
            return new Date(chats[a].createdAt) - new Date(chats[b].createdAt);
        });
        
        // Remove oldest chats
        const chatsToRemove = chatIds.slice(0, chatIds.length - CHAT_LIMIT);
        chatsToRemove.forEach(id => {
            delete chats[id];
        });
    }
    
    // Save to storage
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chats));
}

/**
 * Deletes a chat from storage
 * @param {string} chatId - Unique ID for the chat to delete
 */
function deleteChatFromStorage(chatId) {
    const chats = getAllChatsFromStorage();
    
    if (chats[chatId]) {
        delete chats[chatId];
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chats));
    }
}

/**
 * Updates a chat title in storage
 * @param {string} chatId - Unique ID for the chat
 * @param {string} newTitle - New title for the chat
 */
function updateChatTitleInStorage(chatId, newTitle) {
    const chats = getAllChatsFromStorage();
    
    if (chats[chatId]) {
        chats[chatId].title = newTitle;
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chats));
    }
}

/**
 * Gets all messages for a specific chat
 * @param {string} chatId - Unique ID for the chat
 * @returns {Array} Messages for the chat
 */
function getMessagesFromStorage(chatId) {
    const chats = getAllChatsFromStorage();
    
    if (chats[chatId]) {
        return chats[chatId].messages || [];
    }
    
    return [];
}

/**
 * Saves a message to chat history
 * @param {string} chatId - Unique ID for the chat
 * @param {Object} message - Message object with text, sender, and timestamp
 */
function saveMessageToHistory(chatId, message) {
    const chats = getAllChatsFromStorage();
    
    if (!chats[chatId]) {
        saveChatToStorage(chatId, 'New Chat');
    }
    
    // Add message to chat
    chats[chatId].messages = chats[chatId].messages || [];
    chats[chatId].messages.push(message);
    
    // Limit number of messages
    if (chats[chatId].messages.length > MESSAGE_LIMIT_PER_CHAT) {
        chats[chatId].messages = chats[chatId].messages.slice(-MESSAGE_LIMIT_PER_CHAT);
    }
    
    // Update chat title if it's the first user message
    if (message.sender === 'user' && chats[chatId].messages.filter(m => m.sender === 'user').length === 1) {
        // Use the first ~20 characters of the message as the title
        const title = message.text.length > 20 ? message.text.substring(0, 20) + '...' : message.text;
        chats[chatId].title = title;
    }
    
    // Save to storage
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chats));
}

/**
 * Clears all chat history from storage
 */
function clearAllChatHistory() {
    localStorage.removeItem(CHAT_HISTORY_KEY);
}
