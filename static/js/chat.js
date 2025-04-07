document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const messagesContainer = document.getElementById("messages-container");
  const messageInput = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-btn");
  const newChatBtn = document.getElementById("new-chat-btn");
  const historyList = document.getElementById("history-list");
  const toggleSidebarBtn = document.getElementById("toggle-sidebar");
  const toggleSidebarReturnBtn = document.getElementById(
    "toggle-sidebar-return"
  );
  const sidebar = document.getElementById("sidebar");
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");

  // Initialize variables
  let currentChatId = null;
  let isTyping = false;
  let isFirstMessage = true;
  let isLoadingHistory = false;

  // Event Listeners
  if (sendBtn) sendBtn.addEventListener("click", sendMessage);
  if (messageInput) messageInput.addEventListener("keypress", handleKeyPress);
  if (newChatBtn) newChatBtn.addEventListener("click", createNewChat);
  if (toggleSidebarBtn)
    toggleSidebarBtn.addEventListener("click", toggleSidebar);
  if (toggleSidebarReturnBtn)
    toggleSidebarReturnBtn.addEventListener("click", toggleSidebar);
  if (mobileMenuToggle)
    mobileMenuToggle.addEventListener("click", toggleMobileSidebar);

  // Initialize
  init();

  // Add suggestion chip click handlers
  document.querySelectorAll(".suggestion-chip").forEach((chip) => {
    chip.addEventListener("click", function () {
      const message = this.getAttribute("data-message");
      if (messageInput) {
        messageInput.value = message;
        sendMessage();
      }
    });
  });

  // Add theme badge click handlers from About Us section
  document.querySelectorAll(".theme-badge").forEach((badge) => {
    badge.addEventListener("click", function () {
      const message = this.getAttribute("data-message");
      if (messageInput) {
        messageInput.value = message;
        sendMessage();

        // If sidebar is open in mobile view, close it
        if (
          window.innerWidth < 768 &&
          sidebar &&
          sidebar.classList.contains("sidebar-open")
        ) {
          toggleSidebar();
        }
      }
    });
  });

  // TTS Integration
  const synth = window.speechSynthesis;

  // Create a MutationObserver to watch for new bot messages
  if (messagesContainer) {
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          // Check each added node to see if it's a bot message
          mutation.addedNodes.forEach(function (node) {
            if (
              node.classList &&
              node.classList.contains("message-bot") &&
              window.ttsEnabled
            ) {
              // Get the text content and speak it
              const messageContent = node.querySelector(".message-content");
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

  // Create TTS control panel
  function createTTSControls() {
    // Create the container if it doesn't exist
    if (!document.getElementById("tts-controls")) {
      const ttsControls = document.createElement("div");
      ttsControls.id = "tts-controls";
      ttsControls.className = "tts-controls";
      ttsControls.innerHTML = `
                <div class="tts-control-header">Voice Controls</div>
                <div class="tts-buttons">
                    <button id="tts-pause-btn" class="tts-ctrl-btn" title="Pause speech">
                        <i class="fas fa-pause"></i>
                    </button>
                    <button id="tts-resume-btn" class="tts-ctrl-btn" title="Resume speech">
                        <i class="fas fa-play"></i>
                    </button>
                    <button id="tts-stop-btn" class="tts-ctrl-btn" title="Stop speech">
                        <i class="fas fa-stop"></i>
                    </button>
                </div>
            `;

      // Style the controls
      ttsControls.style.position = "fixed";
      ttsControls.style.bottom = "80px";
      ttsControls.style.right = "20px";
      ttsControls.style.backgroundColor = "white";
      ttsControls.style.borderRadius = "8px";
      ttsControls.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.15)";
      ttsControls.style.padding = "8px";
      ttsControls.style.zIndex = "1000";
      ttsControls.style.display = "none";
      ttsControls.style.flexDirection = "column";
      ttsControls.style.alignItems = "center";
      ttsControls.style.border = "1px solid var(--spring-sage)";

      // Style header
      const header = ttsControls.querySelector(".tts-control-header");
      header.style.fontSize = "12px";
      header.style.fontWeight = "bold";
      header.style.color = "var(--spring-brown)";
      header.style.marginBottom = "5px";

      // Style buttons container
      const btnContainer = ttsControls.querySelector(".tts-buttons");
      btnContainer.style.display = "flex";
      btnContainer.style.gap = "5px";

      // Style buttons
      const buttons = ttsControls.querySelectorAll(".tts-ctrl-btn");
      buttons.forEach((btn) => {
        btn.style.width = "36px";
        btn.style.height = "36px";
        btn.style.borderRadius = "50%";
        btn.style.border = "none";
        btn.style.backgroundColor = "var(--spring-light-green)";
        btn.style.color = "var(--spring-brown)";
        btn.style.cursor = "pointer";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        btn.style.transition = "all 0.2s ease";
      });

      document.body.appendChild(ttsControls);

      // Add event listeners for TTS control buttons
      document
        .getElementById("tts-pause-btn")
        .addEventListener("click", pauseTTS);
      document
        .getElementById("tts-resume-btn")
        .addEventListener("click", resumeTTS);
      document
        .getElementById("tts-stop-btn")
        .addEventListener("click", stopTTS);
    }
  }

  // Initialize TTS controls
  createTTSControls();

  // Function to speak text with enhanced control
  window.speakText = function (text) {
    // Prevent speaking when loading history
    if (isLoadingHistory) return;

    // Cancel any ongoing speech
    synth.cancel();

    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Show TTS controls when speaking starts
    const ttsControls = document.getElementById("tts-controls");
    if (ttsControls) {
      ttsControls.style.display = "flex";
    }

    // Add events to handle when speech ends
    utterance.onend = function () {
      if (ttsControls) {
        setTimeout(() => {
          ttsControls.style.display = "none";
        }, 2000);
      }
    };

    // Speak the text
    synth.speak(utterance);
  };

  // Function to pause TTS
  function pauseTTS() {
    if (synth.speaking) {
      synth.pause();
    }
  }

  // Function to resume TTS
  function resumeTTS() {
    if (synth.paused) {
      synth.resume();
    }
  }

  // Function to stop TTS
  function stopTTS() {
    if (synth.speaking) {
      synth.cancel();
      const ttsControls = document.getElementById("tts-controls");
      if (ttsControls) {
        ttsControls.style.display = "none";
      }
    }
  }

  // Add key events to control TTS
  document.addEventListener("keydown", function (e) {
    // ESC key to stop speech
    if (e.key === "Escape" && synth.speaking) {
      stopTTS();
    }
  });

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
      messageInput.addEventListener("input", function () {
        this.style.height = "auto";
        this.style.height = this.scrollHeight + "px";

        // Cap maximum height
        if (this.scrollHeight > 150) {
          this.style.height = "150px";
          this.style.overflowY = "auto";
        } else {
          this.style.overflowY = "hidden";
        }
      });
    }

    // Attach click handler to message copy buttons (delegated)
    if (messagesContainer) {
      messagesContainer.addEventListener("click", function (e) {
        if (
          e.target.classList.contains("copy-btn") ||
          e.target.closest(".copy-btn")
        ) {
          const button = e.target.classList.contains("copy-btn")
            ? e.target
            : e.target.closest(".copy-btn");
          const messageBubble = button.closest(".message-bubble");
          if (messageBubble) {
            const contentEl = messageBubble.querySelector(".message-content");
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
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showCopyFeedback();
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  }

  /**
   * Shows a brief success message when a message is copied
   */
  function showCopyFeedback() {
    const feedback = document.createElement("div");
    feedback.className = "copy-feedback";
    feedback.textContent = "Copied to clipboard!";

    document.body.appendChild(feedback);

    // Add styles
    feedback.style.position = "fixed";
    feedback.style.bottom = "20px";
    feedback.style.left = "50%";
    feedback.style.transform = "translateX(-50%)";
    feedback.style.padding = "8px 16px";
    feedback.style.backgroundColor = "var(--spring-moss)";
    feedback.style.color = "white";
    feedback.style.borderRadius = "8px";
    feedback.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.2)";
    feedback.style.zIndex = "1000";
    feedback.style.opacity = "0";
    feedback.style.transition = "opacity 0.3s ease";

    // Animate in
    setTimeout(() => {
      feedback.style.opacity = "1";
    }, 10);

    // Remove after delay
    setTimeout(() => {
      feedback.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(feedback);
      }, 300);
    }, 2000);
  }

  /**
   * Handles the Enter key in the message input
   */
  function handleKeyPress(e) {
    if (e.key === "Enter" && !e.shiftKey) {
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
    addMessageToUI(message, "user");

    // Clear the input field
    messageInput.value = "";
    messageInput.style.height = "auto";

    // Reset the textarea size
    messageInput.style.height = "auto";

    // Show typing indicator
    showTypingIndicator();

    // Create a new chat if this is the first message
    if (isFirstMessage) {
      // If this is the first message, start a chat session
      fetch("/start_chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: currentChatId,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.status === "success") {
            isFirstMessage = false;
            sendMessageToServer(message);
          } else {
            hideTypingIndicator();
            console.error("Failed to create chat session:", data.message);
            addMessageToUI(
              "Sorry, I encountered an error creating a new chat session. Please try again.",
              "bot"
            );
          }
        })
        .catch((error) => {
          hideTypingIndicator();
          console.error("Error creating chat session:", error);
          addMessageToUI(
            "Sorry, I encountered an error creating a new chat session. Please try again.",
            "bot"
          );
        });
    } else {
      // Otherwise, just send the message
      sendMessageToServer(message);
    }

    // Save this message to the chat history
    saveMessageToHistory(currentChatId, {
      text: message,
      sender: "user",
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
    // Get the current chat history for context rebuilding if needed
    const chatHistory = getMessagesFromStorage(currentChatId);

    fetch("/send_message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
        chat_id: currentChatId,
        chat_history: chatHistory, // Send the chat history for context rebuilding
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        // Hide typing indicator
        hideTypingIndicator();

        // Add the bot response to the UI
        addMessageToUI(data.text, "bot");

        // Save the bot response to chat history
        saveMessageToHistory(currentChatId, {
          text: data.text,
          sender: "bot",
        });

        // Update chat title if needed
        if (isFirstMessage) {
          updateChatTitleBasedOnExchange(message, data.text);
          isFirstMessage = false;
        }
      })
      .catch((error) => {
        // Hide typing indicator
        hideTypingIndicator();

        console.error("Error sending message:", error);
        addMessageToUI(
          "Sorry, I encountered an error. Please try again.",
          "bot"
        );
      });
  }

  /**
   * Creates a new chat session
   */
  function createNewChat(switchToNewChat = true) {
    // Generate a unique ID for this chat
    const chatId = "chat_" + Date.now();

    // Generate a placeholder title
    const title = "New Chat";

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
    let title = userMessage.split(" ").slice(0, 5).join(" ");

    // Add ellipsis if the message is longer
    if (userMessage.split(" ").length > 5) {
      title += "...";
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
      hour: "2-digit",
      minute: "2-digit",
    });

    // Create the message element
    const messageEl = document.createElement("div");
    messageEl.className = `message message-${sender}`;

    let avatarIcon = '<i class="fas fa-user"></i>';
    if (sender === "bot") {
      avatarIcon = '<i class="fas fa-leaf"></i>';
    }

    const formattedText = formatMessageText(text);

    messageEl.innerHTML = `
            <div class="message-container">
                <div class="message-avatar">
                    ${avatarIcon}
                </div>
                <div class="message-bubble">
                    <div class="message-content">${formattedText}</div>
                    ${
                      sender === "bot"
                        ? '<button class="copy-btn" title="Copy message"><i class="fas fa-copy"></i></button>'
                        : ""
                    }
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
    if (
      text.includes("<p>") ||
      text.includes("<div>") ||
      text.includes("<span>")
    ) {
      return text;
    }

    // Otherwise, add basic formatting
    // - Replace URLs with clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    text = text.replace(urlRegex, function (url) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });

    // - Replace line breaks with <br> tags
    text = text.replace(/\n/g, "<br>");

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
    const indicatorEl = document.createElement("div");
    indicatorEl.className = "message message-bot typing-indicator";
    indicatorEl.innerHTML = `
            <div class="message-container">
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
    const indicator = document.querySelector(".typing-indicator");
    if (indicator) {
      indicator.remove();
    }

    isTyping = false;
  }

  /**
   * Clears all messages from the UI
   */
  function clearMessages() {
    messagesContainer.innerHTML = "";
  }

  /**
   * Displays the welcome message
   */
  function displayWelcomeMessage() {
    const welcomeMessage = document.createElement("div");
    welcomeMessage.className = "welcome-message";
    welcomeMessage.innerHTML = `
            <h2><i class="fas fa-leaf me-2"></i>Welcome to the DIY Guide!</h2>
            <p>Ask me anything about DIY projects. I'm here to help with your crafts, home ideas, and more!</p>
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
    welcomeMessage.querySelectorAll(".suggestion-chip").forEach((chip) => {
      chip.addEventListener("click", function () {
        const message = this.getAttribute("data-message");
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
      const chatTimestamp = parseInt(chatId.split("_")[1] || "0");
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
    historyList.innerHTML = "";

    // Get all chats from storage
    const chats = getAllChatsFromStorage();

    // Add each chat to the history list
    for (const chatId in chats) {
      const chat = chats[chatId];

      // Create the list item
      const listItem = document.createElement("li");

      // Create the link
      const link = document.createElement("a");
      link.className = "dropdown-item chat-history-item";
      link.href = "#";

      // Create a container for the chat title to enable text ellipsis
      const titleSpan = document.createElement("span");
      titleSpan.className = "chat-title";
      titleSpan.textContent = chat.title;
      link.appendChild(titleSpan);

      // Create delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "chat-delete-btn";
      deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
      deleteBtn.title = "Delete chat";
      deleteBtn.setAttribute("aria-label", "Delete chat");

      // Add delete button click handler
      deleteBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        // Confirm deletion
        if (confirm("Delete this chat? This action cannot be undone.")) {
          // Delete from storage
          deleteChatFromStorage(chatId);

          // If the deleted chat is the current chat, create a new one
          if (chatId === currentChatId) {
            createNewChat(true);
          } else {
            // Just update the UI
            updateChatHistoryUI();
          }
        }
      });

      // Add the delete button to the link
      link.appendChild(deleteBtn);

      // Add active class if this is the current chat
      if (chatId === currentChatId) {
        link.classList.add("active");
      }

      // Add click handler for the chat item
      link.addEventListener("click", function (e) {
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

    // Set loading flag to prevent TTS during history loading
    isLoadingHistory = true;

    // Get the messages for this chat
    const messages = getMessagesFromStorage(chatId);

    // Check if we have messages
    if (messages && messages.length > 0) {
      // Add each message to the UI
      messages.forEach((message) => {
        addMessageToUI(message.text, message.sender);
      });

      // Set firstMessage flag (false if we have messages)
      isFirstMessage = false;

      // Only rebuild context if this isn't a brand new chat and if we have messages
      if (messages.length > 0 && chatId.includes("chat_")) {
        // Do a lightweight validation first to see if we need full rebuild
        validateServerContext(chatId, messages);
      }
    } else {
      // Display the welcome message
      displayWelcomeMessage();

      // Set firstMessage flag
      isFirstMessage = true;
    }

    // Reset loading flag after a short delay to ensure all DOM mutations are processed
    setTimeout(() => {
      isLoadingHistory = false;
    }, 100);

    // Update the chat history UI
    updateChatHistoryUI();
  }

  /**
   * Validates if the server has context for this chat
   */
  function validateServerContext(chatId, messages) {
    // Make a lightweight ping to check if this chat exists on the server
    fetch("/start_chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        // Only rebuild context if the server tells us this is a new session
        if (
          data.status === "success" &&
          data.message === "Chat session created"
        ) {
          // If this is needed, do it in the background and only with essential messages
          rebuildChatContextLazy(chatId, messages);
        }
      })
      .catch((error) => {
        console.warn("Error validating context:", error);
      });
  }

  /**
   * Rebuilds server-side context in a lazy, non-blocking way
   * Only sends the most essential messages to rebuild context
   */
  function rebuildChatContextLazy(chatId, messages) {
    // Show a subtle indicator
    const rebuildIndicator = document.createElement("div");
    rebuildIndicator.className = "rebuild-indicator";
    rebuildIndicator.textContent = "Preparing chat memory...";
    document.body.appendChild(rebuildIndicator);

    // Extract only user messages - we only need these to rebuild context
    const userMessages = messages.filter((msg) => msg.sender === "user");

    // Further optimize by only taking every other user message if many exist
    // This significantly reduces API calls while maintaining reasonable context
    let contextMessages = userMessages;
    if (userMessages.length > 5) {
      // Take the first message, last message, and a sampling of others
      const firstMsg = userMessages[0];
      const lastMsg = userMessages[userMessages.length - 1];
      const sampledMessages = [];

      // Take a few messages from the middle with increasing density toward the end
      for (let i = 0; i < Math.min(userMessages.length, 3); i++) {
        const index = Math.floor((userMessages.length / 4) * (i + 1));
        if (index > 0 && index < userMessages.length - 1) {
          sampledMessages.push(userMessages[index]);
        }
      }

      contextMessages = [firstMsg, ...sampledMessages, lastMsg];
    }

    // Only take up to 5 messages regardless
    contextMessages = contextMessages.slice(-5);

    // Use the more efficient rebuild endpoint with our optimized message set
    fetch("/rebuild_context", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        chat_history: contextMessages,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Context lazy-rebuilt:", data);
        // Remove the indicator
        setTimeout(() => {
          if (document.body.contains(rebuildIndicator)) {
            rebuildIndicator.style.opacity = "0";
            setTimeout(() => {
              if (document.body.contains(rebuildIndicator)) {
                document.body.removeChild(rebuildIndicator);
              }
            }, 300);
          }
        }, 1000);
      })
      .catch((error) => {
        console.warn("Error lazy-rebuilding context:", error);
        if (document.body.contains(rebuildIndicator)) {
          document.body.removeChild(rebuildIndicator);
        }
      });
  }

  /**
   * Toggles the sidebar
   */
  function toggleSidebar() {
    sidebar.classList.toggle("collapsed");
    document.querySelector(".main-content").classList.toggle("expanded");
  }

  /**
   * Toggles the mobile sidebar
   */
  function toggleMobileSidebar() {
    sidebar.classList.toggle("mobile-visible");
  }
});
