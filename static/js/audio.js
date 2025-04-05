document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const micButton = document.getElementById('mic-btn');
    const volumeButton = document.getElementById('volume-btn');
    const messageInput = document.getElementById('message-input');
    
    // Set global TTS flag
    window.ttsEnabled = false;
    
    // Audio recording variables
    let mediaRecorder;
    let audioChunks = [];
    let recordingStartTime;
    let recordingTimer;
    let recordingIndicator;
    let isRecording = false;
    
    // Add event listeners
    // Add click event listener to the record button
    if (micButton) {
        micButton.addEventListener('click', function() {
            if (!isRecording) {
                startSpeechRecognition();
            } else {
                stopRecording();
            }
        });
    }
    // Add click event listener to the volume button
    
    if (volumeButton) {
        volumeButton.addEventListener('click', toggleTTS);
    }
    
    // Add voice control styles
    addVoiceControlStyles();
    
    /**
     * Adds necessary styles for voice controls
     */
    function addVoiceControlStyles() {
        // Check if styles already exist
        if (document.getElementById('voice-control-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'voice-control-styles';
        style.textContent = `
            .voice-recording-indicator {
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background-color: var(--spring-moss);
                color: white;
                padding: 8px 16px;
                border-radius: 30px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 1000;
                animation: fadeInBottom 0.3s ease;
            }
            
            .voice-recording-indicator.error {
                background-color: #e74c3c;
            }
            
            @keyframes fadeInBottom {
                from {
                    opacity: 0;
                    transform: translate(-50%, 20px);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, 0);
                }
            }
            
            .recording-dot {
                width: 12px;
                height: 12px;
                background-color: #ff4a4a;
                border-radius: 50%;
                animation: pulse 1.5s infinite;
            }
            
            @keyframes pulse {
                0% {
                    transform: scale(0.95);
                    box-shadow: 0 0 0 0 rgba(255, 74, 74, 0.7);
                }
                70% {
                    transform: scale(1);
                    box-shadow: 0 0 0 10px rgba(255, 74, 74, 0);
                }
                100% {
                    transform: scale(0.95);
                    box-shadow: 0 0 0 0 rgba(255, 74, 74, 0);
                }
            }
            
            .mic-btn.recording {
                color: #ff4a4a;
                animation: pulse 1.5s infinite;
            }
            
            .toast-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: var(--spring-sage);
                color: white;
                padding: 10px 15px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 1100;
                opacity: 0;
                transform: translateY(-20px);
                transition: all 0.3s ease;
            }
            
            .toast-notification.show {
                opacity: 1;
                transform: translateY(0);
            }
            
            .toast-notification i {
                font-size: 18px;
            }
            
            .toast-notification.error {
                background-color: #e74c3c;
            }
            
            .toast-notification.success {
                background-color: var(--spring-moss);
            }
            
            .toast-notification.info {
                background-color: var(--spring-sage);
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Toggles TTS functionality
     */
    function toggleTTS() {
        window.ttsEnabled = !window.ttsEnabled;
        
        // Update button appearance
        if (volumeButton) {
            if (window.ttsEnabled) {
                volumeButton.innerHTML = '<i class="fas fa-volume-up"></i>';
                volumeButton.classList.add('active');
                showToast('Text-to-speech enabled', 'fa-volume-up', 'var(--spring-sage)');
            } else {
                volumeButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
                volumeButton.classList.remove('active');
                showToast('Text-to-speech disabled', 'fa-volume-mute', 'var(--spring-sage)');
                
                // Stop any ongoing speech
                if (window.stopSpeaking) {
                    window.stopSpeaking();
                }
            }
        }
    }
    
    /**
     * Starts speech recognition for automatic transcription
     */
    function startSpeechRecognition() {
        // Check if the browser supports the Web Speech API
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            
            recognition.continuous = false;
            recognition.interimResults = true;
            
            // Show recording indicator
            showRecordingIndicator();
            
            // Update mic button
            if (micButton) {
                micButton.classList.add('recording');
                micButton.innerHTML = '<i class="fas fa-stop"></i>';
            }
            
            // Set recording flag
            isRecording = true;
            
            recognition.onstart = function() {
                showToast('Listening...', 'fa-microphone', 'var(--spring-sage)');
            };
            
            recognition.onresult = function(event) {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');
                
                // Update the input field with the transcription
                if (messageInput) {
                    messageInput.value = transcript;
                    
                    // Trigger input event to resize textarea
                    const inputEvent = new Event('input', { bubbles: true });
                    messageInput.dispatchEvent(inputEvent);
                }
            };
            
            recognition.onerror = function(event) {
                console.error('Speech recognition error:', event.error);
                showToast('Error: ' + event.error, 'fa-exclamation-circle', '#e74c3c');
                
                // Fall back to regular audio recording if needed
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    startRecording();
                } else {
                    resetAudioUI();
                }
            };
            
            recognition.onend = function() {
                // Reset the UI
                resetAudioUI();
                
                // Show transcription feedback
                if (messageInput && messageInput.value) {
                    showTranscriptionToast(messageInput.value);
                }
            };
            
            // Start recognition
            recognition.start();
            
        } else {
            // Fall back to regular audio recording if Speech Recognition is not supported
            startRecording();
        }
    }
    
    /**
     * Starts audio recording (for browsers without speech recognition)
     */
    function startRecording() {
        // Check if mediaRecorder is already active
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            return;
        }
        
        // Reset audio chunks
        audioChunks = [];
        
        // Request microphone access
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // Show recording indicator
                showRecordingIndicator();
                
                // Update mic button
                if (micButton) {
                    micButton.classList.add('recording');
                    micButton.innerHTML = '<i class="fas fa-stop"></i>';
                }
                
                // Set recording flag
                isRecording = true;
                
                // Create media recorder
                mediaRecorder = new MediaRecorder(stream);
                
                // Set recording start time
                recordingStartTime = Date.now();
                
                // Start duration timer
                startRecordingTimer();
                
                // Collect audio chunks
                mediaRecorder.ondataavailable = e => {
                    if (e.data.size > 0) {
                        audioChunks.push(e.data);
                    }
                };
                
                // Handle recording stop
                mediaRecorder.onstop = () => {
                    // Stop all tracks in the stream
                    stream.getTracks().forEach(track => track.stop());
                    
                    // Process the recorded audio
                    sendAudioMessage();
                };
                
                // Start recording
                mediaRecorder.start();
                
                showToast('Recording audio...', 'fa-microphone', 'var(--spring-sage)');
                
            }).catch(error => {
                console.error('Error accessing microphone:', error);
                showToast('Error: Cannot access microphone', 'fa-exclamation-circle', '#e74c3c');
                resetAudioUI();
            });
    }
    
    /**
     * Updates the recording indicator with the current duration
     */
    function updateRecordingIndicator() {
        if (!recordingIndicator) return;
        
        const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(duration / 60).toString().padStart(2, '0');
        const seconds = (duration % 60).toString().padStart(2, '0');
        
        const durationElement = recordingIndicator.querySelector('.recording-duration');
        if (durationElement) {
            durationElement.textContent = `${minutes}:${seconds}`;
        }
    }
    
    /**
     * Starts the recording duration timer
     */
    function startRecordingTimer() {
        // Clear any existing timer
        if (recordingTimer) {
            clearInterval(recordingTimer);
        }
        
        // Start a new timer
        recordingTimer = setInterval(updateRecordingIndicator, 1000);
        
        // Update immediately
        updateRecordingIndicator();
    }
    
    /**
     * Shows the recording indicator
     */
    function showRecordingIndicator() {
        // Remove any existing indicator
        const existingIndicator = document.querySelector('.voice-recording-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Create new indicator
        recordingIndicator = document.createElement('div');
        recordingIndicator.className = 'voice-recording-indicator';
        recordingIndicator.innerHTML = `
            <div class="recording-dot"></div>
            <span>Recording</span>
            <span class="recording-duration">00:00</span>
            <button class="cancel-recording-btn">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add cancel button listener
        const cancelBtn = recordingIndicator.querySelector('.cancel-recording-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', cancelAudioRecording);
        }
        
        // Add to the document
        document.body.appendChild(recordingIndicator);
    }
    
    /**
     * Stops audio recording
     */
    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        
        resetAudioUI();
    }
    
    /**
     * Sends the recorded audio to the server for transcription
     */
    function sendAudioMessage() {
        if (audioChunks.length === 0) {
            resetAudioUI();
            return;
        }
        
        // Show processing feedback
        showAudioProcessingFeedback();
        
        // Create audio blob
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        // Create FormData
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        // Send to server
        fetch('/save_audio', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.text) {
                // Add the transcribed text to the message input
                if (messageInput) {
                    messageInput.value = data.text;
                    
                    // Trigger input event to resize textarea
                    const inputEvent = new Event('input', { bubbles: true });
                    messageInput.dispatchEvent(inputEvent);
                    
                    // Show transcription feedback
                    showTranscriptionToast(data.text);
                }
            } else {
                showToast('Transcription failed', 'fa-exclamation-circle', '#e74c3c');
            }
        })
        .catch(error => {
            console.error('Error sending audio:', error);
            showToast('Error processing audio', 'fa-exclamation-circle', '#e74c3c');
        })
        .finally(() => {
            resetAudioUI();
        });
    }
    
    /**
     * Shows audio processing feedback as a toast notification
     */
    function showAudioProcessingFeedback() {
        showToast('Processing audio...', 'fa-cog fa-spin', 'var(--spring-sage)');
    }
    
    /**
     * Shows transcription feedback as a toast notification
     */
    function showTranscriptionToast(text) {
        // Truncate text if too long
        const displayText = text.length > 30 ? text.substring(0, 30) + '...' : text;
        showToast('Transcribed: ' + displayText, 'fa-check', 'var(--spring-moss)');
    }
    
    /**
     * Shows a toast notification
     */
    function showToast(message, icon, bgColor) {
        // Remove any existing toast
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        // Set background color
        toast.style.backgroundColor = bgColor;
        
        // Add to document
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Auto remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * Cancels the current audio recording
     */
    function cancelAudioRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            // Stop the media recorder without processing
            mediaRecorder.stop();
            
            // Clear the audio chunks
            audioChunks = [];
            
            showToast('Recording cancelled', 'fa-times', 'var(--spring-sage)');
        }
        
        resetAudioUI();
    }
    
    /**
     * Resets the audio UI
     */
    function resetAudioUI() {
        // Reset recording flag
        isRecording = false;
        
        // Update mic button
        if (micButton) {
            micButton.classList.remove('recording');
            micButton.innerHTML = '<i class="fas fa-microphone"></i>';
        }
        
        // Remove recording indicator
        if (recordingIndicator && recordingIndicator.parentNode) {
            recordingIndicator.parentNode.removeChild(recordingIndicator);
        }
        
        // Clear the timer
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
    }
});
