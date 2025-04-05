document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const recordBtn = document.getElementById('record-btn');
    const recordingIndicator = document.getElementById('recording-indicator');
    const audioPlayer = document.getElementById('audio-player');
    const audioElement = document.getElementById('audio-element');
    const sendAudioBtn = document.getElementById('send-audio-btn');
    const cancelAudioBtn = document.getElementById('cancel-audio-btn');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    
    // Create voice menu button
    createVoiceControls();
    
    // Audio state
    let mediaRecorder;
    let audioChunks = [];
    let audioBlob;
    let isRecording = false;
    let recordingTimer;
    let recordingDuration = 0;
    let ttsEnabled = false;
    
    // Get voice elements after creation
    const voiceMenuBtn = document.getElementById('voice-menu-btn');
    const voiceControls = document.getElementById('voice-controls');
    const ttsToggleBtn = document.getElementById('tts-toggle-btn');
    
    // Check for browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Audio recording is not supported in this browser');
        if (recordBtn) {
            recordBtn.disabled = true;
            recordBtn.title = 'Audio recording not supported in this browser';
        }
    }
    
    // Event Listeners
    if (recordBtn) recordBtn.addEventListener('click', toggleRecording);
    if (sendAudioBtn) sendAudioBtn.addEventListener('click', sendAudioMessage);
    if (cancelAudioBtn) cancelAudioBtn.addEventListener('click', cancelAudioRecording);
    if (voiceMenuBtn) voiceMenuBtn.addEventListener('click', toggleVoiceMenu);
    if (ttsToggleBtn) ttsToggleBtn.addEventListener('click', toggleTTS);

    // Initialize speech recognition if available
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        // Event handlers for speech recognition
        recognition.onresult = function(event) {
            const result = event.results[0];
            const transcript = result[0].transcript;
            
            if (result.isFinal) {
                // Set the transcript in the message input for editing
                if (messageInput) {
                    messageInput.value = transcript;
                    messageInput.focus();
                    
                    // Highlight the text for easier editing
                    messageInput.select();
                    
                    // Show a toast notification
                    showTranscriptionToast(transcript);
                }
                
                // Reset the UI
                resetAudioUI();
            }
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            resetAudioUI();
            
            if (event.error === 'no-speech') {
                showErrorToast('No speech detected. Please try again.');
            } else {
                showErrorToast('Speech recognition error. Please try again.');
            }
        };
    } else {
        console.warn('Speech recognition not supported in this browser');
    }
    
    /**
     * Creates the voice control menu
     */
    function createVoiceControls() {
        // Create the container for the voice controls
        const audioControls = document.querySelector('.audio-controls');
        if (!audioControls) return;
        
        // Create the voice menu button
        const menuBtn = document.createElement('button');
        menuBtn.id = 'voice-menu-btn';
        menuBtn.className = 'btn btn-circle voice-menu-btn';
        menuBtn.title = 'Voice controls';
        menuBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        
        // Create the voice controls dropdown
        const controls = document.createElement('div');
        controls.id = 'voice-controls';
        controls.className = 'voice-controls';
        
        // Add the TTS toggle button
        const ttsBtn = document.createElement('button');
        ttsBtn.id = 'tts-toggle-btn';
        ttsBtn.className = 'voice-control-btn';
        ttsBtn.innerHTML = '<i class="fas fa-volume-up"></i> Text-to-Speech';
        
        // Add the speech-to-text button
        const sttBtn = document.createElement('button');
        sttBtn.id = 'stt-btn';
        sttBtn.className = 'voice-control-btn';
        sttBtn.innerHTML = '<i class="fas fa-microphone"></i> Speech-to-Text';
        sttBtn.addEventListener('click', startSpeechRecognition);
        
        // Append the controls
        controls.appendChild(ttsBtn);
        controls.appendChild(sttBtn);
        
        // Add everything to the page
        audioControls.insertBefore(menuBtn, audioControls.firstChild);
        audioControls.insertBefore(controls, audioControls.firstChild);
        
        // Add CSS for the voice controls
        addVoiceControlStyles();
    }
    
    /**
     * Adds necessary styles for voice controls
     */
    function addVoiceControlStyles() {
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            /* Voice menu and controls */
            .voice-menu-btn {
                position: relative;
                border-radius: 50%;
                width: 42px;
                height: 42px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 10px;
                background-color: var(--spring-light-yellow);
                border: none;
                color: var(--spring-brown);
                transition: all 0.2s ease;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            }
            
            .voice-menu-btn.active {
                background-color: var(--spring-sage);
                color: white;
            }
            
            .voice-menu-btn:hover {
                transform: scale(1.05);
            }
            
            .voice-controls {
                position: absolute;
                bottom: 100%;
                left: 0;
                background-color: white;
                border-radius: 12px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                width: 180px;
                z-index: 10;
                transform: translateY(10px);
                opacity: 0;
                pointer-events: none;
                transition: all 0.2s ease;
                margin-bottom: 10px;
            }
            
            .voice-controls-open {
                transform: translateY(0);
                opacity: 1;
                pointer-events: all;
            }
            
            .voice-control-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                border-radius: 8px;
                background-color: var(--spring-light-yellow);
                color: var(--spring-brown);
                border: none;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .voice-control-btn:hover {
                background-color: var(--spring-yellow);
            }
            
            .voice-control-btn.active {
                background-color: var(--spring-sage);
                color: white;
            }
            
            .voice-control-btn i {
                width: 20px;
                text-align: center;
            }
            
            .tts-toggle-container {
                display: none !important;
            }
        `;
        document.head.appendChild(styleEl);
    }
    
    /**
     * Toggles the voice control menu
     */
    function toggleVoiceMenu() {
        if (voiceControls) {
            voiceControls.classList.toggle('voice-controls-open');
            voiceMenuBtn.classList.toggle('active');
        }
    }
    
    /**
     * Toggles TTS functionality
     */
    function toggleTTS() {
        ttsEnabled = !ttsEnabled;
        ttsToggleBtn.classList.toggle('active', ttsEnabled);
        
        // Set ttsEnabled value on the window for access in other scripts
        window.ttsEnabled = ttsEnabled;
        
        // Show status toast
        if (ttsEnabled) {
            showToast('Text-to-speech activated', 'volume-up', 'var(--spring-sage)');
        } else {
            showToast('Text-to-speech deactivated', 'volume-mute', 'var(--spring-brown)');
            
            // Stop any ongoing speech
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        }
    }
    
    /**
     * Starts speech recognition for transcription
     */
    function startSpeechRecognition() {
        if (recognition) {
            try {
                recognition.start();
                showToast('Listening...', 'microphone', 'var(--spring-moss)');
                
                // Close the menu
                toggleVoiceMenu();
                
                // Start recording UI
                isRecording = true;
                if (recordBtn) {
                    recordBtn.classList.add('recording', 'pulse-recording');
                    recordBtn.innerHTML = '<i class="fas fa-stop"></i>';
                }
                if (recordingIndicator) {
                    recordingIndicator.classList.remove('d-none');
                }
                
                // Reset recording duration
                recordingDuration = 0;
                updateRecordingIndicator();
                
                // Start recording timer
                recordingTimer = setInterval(() => {
                    recordingDuration++;
                    updateRecordingIndicator();
                }, 1000);
                
                // Safety timeout (30 seconds max)
                setTimeout(() => {
                    if (isRecording) {
                        stopRecording();
                    }
                }, 30000);
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                showErrorToast('Could not start speech recognition. Please try again.');
            }
        } else {
            showErrorToast('Speech recognition is not supported in your browser.');
        }
    }
    
    /**
     * Toggles audio recording
     */
    function toggleRecording() {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }
    
    /**
     * Starts audio recording
     */
    function startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // Update UI
                isRecording = true;
                recordBtn.classList.add('recording');
                recordBtn.innerHTML = '<i class="fas fa-stop"></i>';
                recordingIndicator.classList.remove('d-none');
                audioPlayer.classList.add('d-none');
                
                // Reset recording duration
                recordingDuration = 0;
                updateRecordingIndicator();
                
                // Start recording timer
                recordingTimer = setInterval(() => {
                    recordingDuration++;
                    updateRecordingIndicator();
                }, 1000);
                
                // Create media recorder
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                // Add data handler
                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };
                
                // Add stop handler
                mediaRecorder.onstop = () => {
                    // Clear recording timer
                    clearInterval(recordingTimer);
                    
                    // Create audio blob
                    audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    
                    // Create audio URL
                    const audioURL = URL.createObjectURL(audioBlob);
                    audioElement.src = audioURL;
                    
                    // Update UI
                    recordingIndicator.classList.add('d-none');
                    audioPlayer.classList.remove('d-none');
                    
                    // Release stream tracks
                    stream.getTracks().forEach(track => track.stop());
                };
                
                // Start recording
                mediaRecorder.start();
                
                // Add visual recording feedback
                recordBtn.classList.add('pulse-recording');
                
                // Safety timeout (2 minutes max)
                setTimeout(() => {
                    if (isRecording) {
                        stopRecording();
                    }
                }, 120000);
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                showErrorToast('Could not access microphone. Please check your browser permissions.');
                resetAudioUI();
            });
    }
    
    /**
     * Updates the recording indicator with the current duration
     */
    function updateRecordingIndicator() {
        const minutes = Math.floor(recordingDuration / 60);
        const seconds = recordingDuration % 60;
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        const recordingTextEl = document.querySelector('.recording-text');
        if (recordingTextEl) {
            recordingTextEl.textContent = `Recording... ${formattedTime}`;
        }
    }
    
    /**
     * Stops audio recording
     */
    function stopRecording() {
        // If using speech recognition
        if (recognition && isRecording) {
            try {
                recognition.stop();
            } catch (error) {
                console.error('Error stopping speech recognition:', error);
            }
        }
        
        // If using MediaRecorder
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
        }
        
        // Update UI
        isRecording = false;
        if (recordBtn) {
            recordBtn.classList.remove('recording', 'pulse-recording');
            recordBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        }
        
        // Clear recording timer
        if (recordingTimer) {
            clearInterval(recordingTimer);
        }
    }
    
    /**
     * Sends the recorded audio to the server for transcription
     */
    function sendAudioMessage() {
        if (!audioBlob) return;
        
        // Create form data
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        
        // Show loading state
        sendAudioBtn.disabled = true;
        sendAudioBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        // Send to server
        fetch('/save_audio', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log('Audio upload successful:', data);
            
            // Reset UI
            resetAudioUI();
            
            // Show success feedback
            showAudioProcessingFeedback();
            
            // If we have a transcription, populate the message input
            if (data.transcription) {
                if (messageInput) {
                    messageInput.value = data.transcription;
                    messageInput.focus();
                    
                    // Highlight the text for easier editing
                    messageInput.select();
                    
                    // Show a toast notification
                    showTranscriptionToast(data.transcription);
                }
            } else {
                // Fallback if no transcription available
                messageInput.value = "I sent an audio message about DIY projects";
                sendBtn.click();
            }
        })
        .catch(error => {
            console.error('Error uploading audio:', error);
            showErrorToast('There was an error uploading your audio. Please try again.');
            resetAudioUI();
        });
    }
    
    /**
     * Shows audio processing feedback as a toast notification
     */
    function showAudioProcessingFeedback() {
        showToast('Audio message processed!', 'check-circle', 'var(--spring-moss)');
    }
    
    /**
     * Shows transcription feedback as a toast notification
     */
    function showTranscriptionToast(text) {
        const shortened = text.length > 30 ? text.substring(0, 30) + '...' : text;
        showToast(`Transcribed: "${shortened}" - Edit if needed.`, 'comment-alt', 'var(--spring-sage)');
    }
    
    /**
     * Shows an error toast notification
     */
    function showErrorToast(message) {
        showToast(message, 'exclamation-circle', 'var(--spring-brown)');
    }
    
    /**
     * Displays a toast notification
     */
    function showToast(message, icon, bgColor) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'audio-processing-toast';
        toast.innerHTML = `
            <div class="audio-toast-content">
                <i class="fas fa-${icon}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add toast styles via JavaScript since we're creating it dynamically
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.backgroundColor = bgColor || 'var(--spring-moss)';
        toast.style.color = 'white';
        toast.style.padding = '10px 15px';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        toast.style.zIndex = '1050';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.justifyContent = 'center';
        toast.style.animation = 'fadeInUp 0.3s, fadeOut 0.3s 2.7s forwards';
        
        document.body.appendChild(toast);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    /**
     * Cancels the current audio recording
     */
    function cancelAudioRecording() {
        if (isRecording) {
            stopRecording();
        }
        
        resetAudioUI();
    }
    
    /**
     * Resets the audio UI
     */
    function resetAudioUI() {
        // Reset UI elements
        if (audioPlayer) audioPlayer.classList.add('d-none');
        if (recordingIndicator) recordingIndicator.classList.add('d-none');
        
        if (sendAudioBtn) {
            sendAudioBtn.disabled = false;
            sendAudioBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
        
        if (recordBtn) {
            recordBtn.classList.remove('recording', 'pulse-recording');
            recordBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        }
        
        // Clear recording timer if active
        if (recordingTimer) {
            clearInterval(recordingTimer);
        }
        
        // Clear audio data
        if (audioElement) audioElement.src = '';
        audioBlob = null;
        audioChunks = [];
        isRecording = false;
    }
    
    // Add pulse animation for recording button
    const style = document.createElement('style');
    style.textContent = `
        .pulse-recording {
            animation: pulseRecord 1.5s infinite;
        }
        
        @keyframes pulseRecord {
            0% {
                box-shadow: 0 0 0 0 rgba(144, 177, 142, 0.7);
            }
            70% {
                box-shadow: 0 0 0 10px rgba(144, 177, 142, 0);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(144, 177, 142, 0);
            }
        }
        
        @keyframes fadeInUp {
            from { 
                opacity: 0; 
                transform: translateY(20px);
            }
            to { 
                opacity: 1; 
                transform: translateY(0);
            }
        }
        
        @keyframes fadeOut {
            from { 
                opacity: 1; 
            }
            to { 
                opacity: 0; 
            }
        }
        
        .audio-toast-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .audio-toast-content i {
            font-size: 1.2rem;
        }
    `;
    document.head.appendChild(style);
});
