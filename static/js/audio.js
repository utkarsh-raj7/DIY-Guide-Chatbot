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
                
                // Create media recorder
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                // Add data handler
                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };
                
                // Add stop handler
                mediaRecorder.onstop = () => {
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
            });
    }
    
    /**
     * Stops audio recording
     */
    function stopRecording() {
        if (!mediaRecorder) return;
        
        // Update UI
        isRecording = false;
        recordBtn.classList.remove('recording');
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
        
        // Clear audio data
        audioElement.src = '';
        audioBlob = null;
        audioChunks = [];
    }
});
