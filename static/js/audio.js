document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const recordBtn = document.getElementById('record-btn');
    const recordingIndicator = document.getElementById('recording-indicator');
    const audioPlayer = document.getElementById('audio-player');
    const audioElement = document.getElementById('audio-element');
    const sendAudioBtn = document.getElementById('send-audio-btn');
    const cancelAudioBtn = document.getElementById('cancel-audio-btn');
    
    // Audio state
    let mediaRecorder;
    let audioChunks = [];
    let audioBlob;
    let isRecording = false;
    let recordingTimer;
    let recordingDuration = 0;
    
    // Check for browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Audio recording is not supported in this browser');
        recordBtn.disabled = true;
        recordBtn.title = 'Audio recording not supported in this browser';
        return;
    }
    
    // Event Listeners
    recordBtn.addEventListener('click', toggleRecording);
    sendAudioBtn.addEventListener('click', sendAudioMessage);
    cancelAudioBtn.addEventListener('click', cancelAudioRecording);
    
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
                alert('Could not access microphone. Please check your browser permissions.');
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
        document.querySelector('.recording-text').textContent = `Recording... ${formattedTime}`;
    }
    
    /**
     * Stops audio recording
     */
    function stopRecording() {
        if (!mediaRecorder) return;
        
        // Update UI
        isRecording = false;
        recordBtn.classList.remove('recording', 'pulse-recording');
        recordBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        
        // Stop recording
        mediaRecorder.stop();
    }
    
    /**
     * Sends the recorded audio to the server
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
            
            // In a production app, this would now transcribe the audio
            // and send the text to the chat
            // For demonstration, we'll add a placeholder message
            
            // Access the chat.js functions
            const messageInput = document.getElementById('message-input');
            const sendBtn = document.getElementById('send-btn');
            
            messageInput.value = "I sent an audio message asking about DIY projects";
            // Trigger a click on send button to process the message
            sendBtn.click();
        })
        .catch(error => {
            console.error('Error uploading audio:', error);
            alert('There was an error uploading your audio. Please try again.');
            resetAudioUI();
        });
    }
    
    /**
     * Shows audio processing feedback as a toast notification
     */
    function showAudioProcessingFeedback() {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'audio-processing-toast';
        toast.innerHTML = `
            <div class="audio-toast-content">
                <i class="fas fa-check-circle"></i>
                <span>Audio message received!</span>
            </div>
        `;
        
        // Add toast styles via JavaScript since we're creating it dynamically
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.backgroundColor = 'var(--summer-amber)';
        toast.style.color = 'white';
        toast.style.padding = '10px 15px';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        toast.style.zIndex = '1050';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.justifyContent = 'center';
        toast.style.animation = 'fadeInUp 0.3s, fadeOut 0.3s 2.7s forwards';
        
        // Add keyframes for animations
        const style = document.createElement('style');
        style.textContent = `
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
        audioPlayer.classList.add('d-none');
        recordingIndicator.classList.add('d-none');
        sendAudioBtn.disabled = false;
        sendAudioBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        recordBtn.classList.remove('recording', 'pulse-recording');
        recordBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        
        // Clear recording timer if active
        if (recordingTimer) {
            clearInterval(recordingTimer);
        }
        
        // Clear audio data
        audioElement.src = '';
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
                box-shadow: 0 0 0 0 rgba(255, 94, 120, 0.7);
            }
            70% {
                box-shadow: 0 0 0 10px rgba(255, 94, 120, 0);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(255, 94, 120, 0);
            }
        }
    `;
    document.head.appendChild(style);
});
