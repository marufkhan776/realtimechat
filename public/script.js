// Global variables
let socket;
let currentUser = null;
let currentRoom = null;
let isAdmin = false;
let youtubePlayer = null;
let localMediaElement = null;
let isYouTubeAPIReady = false;

// Socket.IO connection
function initializeSocket() {
    socket = io();
    
    // Connection events
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showNotification('Connection lost. Trying to reconnect...', 'error');
    });
    
    // User events
    socket.on('join-success', (data) => {
        currentUser = data;
        document.getElementById('user-display-name').textContent = data.username;
        showScreen('room-screen');
    });
    
    // Room events
    socket.on('room-created', (data) => {
        joinedRoom(data.roomId, data.isCreator);
    });
    
    socket.on('join-approved', (data) => {
        joinedRoom(data.roomId, data.isCreator);
    });
    
    socket.on('join-rejected', () => {
        showNotification('Your join request was rejected', 'error');
    });
    
    socket.on('room-full', () => {
        showNotification('Room is full', 'error');
    });
    
    socket.on('join-request', (data) => {
        if (isAdmin) {
            showJoinRequest(data);
        }
    });
    
    socket.on('user-joined', (data) => {
        showNotification(`${data.username} joined the room`, 'success');
        updateUsersList(data.users);
    });
    
    socket.on('user-left', (data) => {
        showNotification(`${data.username} left the room`, 'info');
        updateUsersList(data.users);
    });
    
    socket.on('removed-from-room', () => {
        showNotification('You were removed from the room', 'error');
        leaveRoom();
    });
    
    // Chat events
    socket.on('new-message', (message) => {
        displayMessage(message);
    });
    
    socket.on('room-state', (state) => {
        loadRoomState(state);
    });
    
    // Media sync events
    socket.on('youtube-sync', (data) => {
        if (youtubePlayer && !isAdmin) {
            handleYouTubeSync(data);
        }
    });
    
    socket.on('local-media-sync', (data) => {
        if (localMediaElement && !isAdmin) {
            handleLocalMediaSync(data);
        }
    });
}

// Screen management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Notification system
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Join app
function joinApp() {
    const username = document.getElementById('username-input').value.trim();
    if (!username) {
        showNotification('Please enter a username', 'error');
        return;
    }
    
    socket.emit('join-app', { username });
}

// Room management
function createRoom(maxUsers) {
    socket.emit('create-room', { maxUsers: parseInt(maxUsers) });
}

function joinRoom() {
    const roomId = document.getElementById('room-id-input').value.trim().toUpperCase();
    if (!roomId) {
        showNotification('Please enter a room ID', 'error');
        return;
    }
    
    socket.emit('join-room-request', { roomId });
    showNotification('Join request sent. Waiting for approval...', 'info');
}

function joinedRoom(roomId, isCreator) {
    currentRoom = roomId;
    isAdmin = isCreator;
    
    document.getElementById('current-room-id').textContent = roomId;
    document.getElementById('room-id-display').textContent = roomId;
    
    if (isAdmin) {
        document.getElementById('admin-badge').style.display = 'flex';
        document.getElementById('admin-controls').style.display = 'flex';
        document.getElementById('join-requests-section').style.display = 'block';
    }
    
    showScreen('chat-screen');
    socket.emit('get-room-state');
    
    showNotification(`${isAdmin ? 'Room created' : 'Joined room'}: ${roomId}`, 'success');
}

function leaveRoom() {
    currentRoom = null;
    isAdmin = false;
    
    // Reset UI
    document.getElementById('admin-badge').style.display = 'none';
    document.getElementById('admin-controls').style.display = 'none';
    document.getElementById('join-requests-section').style.display = 'none';
    
    // Clear messages and users
    document.getElementById('chat-messages').innerHTML = '';
    document.getElementById('users-list').innerHTML = '';
    
    // Reset media
    resetMediaPlayer();
    
    showScreen('room-screen');
}

function loadRoomState(state) {
    // Load users
    updateUsersList(state.users);
    
    // Load messages
    document.getElementById('chat-messages').innerHTML = '';
    state.messages.forEach(message => {
        displayMessage(message, false);
    });
    
    // Load media state
    if (state.media && state.media.type) {
        if (state.media.type === 'youtube' && state.media.url) {
            loadYouTubeVideo(state.media.url, state.media.currentTime, state.media.isPlaying);
        }
    }
}

function updateUsersList(users) {
    const usersList = document.getElementById('users-list');
    const userCount = document.getElementById('user-count');
    
    userCount.textContent = users.length;
    usersList.innerHTML = '';
    
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        const isCurrentUser = user.id === currentUser.id;
        const isRoomAdmin = user.id === currentRoom; // Assuming first user is admin
        
        userItem.innerHTML = `
            <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
            <div class="user-info">
                <div class="user-name">
                    ${user.username} 
                    ${isCurrentUser ? '(You)' : ''}
                    ${isRoomAdmin ? '👑' : ''}
                </div>
                <div class="user-status">Online</div>
            </div>
            ${isAdmin && !isCurrentUser ? `
                <div class="user-actions">
                    <button class="btn-icon" onclick="removeUser('${user.id}')" title="Remove user">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            ` : ''}
        `;
        
        usersList.appendChild(userItem);
    });
}

function removeUser(userId) {
    if (confirm('Are you sure you want to remove this user?')) {
        socket.emit('remove-user', { userId });
    }
}

// Chat functionality
function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const content = messageInput.value.trim();
    
    if (!content) return;
    
    socket.emit('send-message', {
        content: content,
        type: 'text'
    });
    
    messageInput.value = '';
}

function sendImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        socket.emit('send-message', {
            content: e.target.result,
            type: 'image'
        });
    };
    reader.readAsDataURL(file);
}

function sendEmoji(emoji) {
    socket.emit('send-message', {
        content: emoji,
        type: 'emoji'
    });
}

function displayMessage(message, animate = true) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    
    const isOwnMessage = message.userId === currentUser.id;
    messageElement.className = `message ${isOwnMessage ? 'own' : ''}`;
    
    const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let contentHTML = '';
    if (message.type === 'image') {
        contentHTML = `<img src="${message.content}" alt="Shared image" class="message-image">`;
    } else if (message.type === 'emoji') {
        contentHTML = `<span style="font-size: 2rem;">${message.content}</span>`;
    } else {
        contentHTML = `<div class="message-text">${escapeHtml(message.content)}</div>`;
    }
    
    messageElement.innerHTML = `
        <div class="message-avatar">${message.username.charAt(0).toUpperCase()}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-username">${message.username}</span>
                <span class="message-time">${timestamp}</span>
            </div>
            ${contentHTML}
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// YouTube functionality
function onYouTubeIframeAPIReady() {
    isYouTubeAPIReady = true;
    console.log('YouTube API ready');
}

function extractYouTubeVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function loadYouTubeVideo(url, startTime = 0, autoplay = false) {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
        showNotification('Invalid YouTube URL', 'error');
        return;
    }
    
    document.getElementById('youtube-player-container').style.display = 'block';
    document.getElementById('local-player-container').style.display = 'none';
    document.getElementById('no-media-state').style.display = 'none';
    
    if (!youtubePlayer) {
        youtubePlayer = new YT.Player('youtube-player', {
            height: '250',
            width: '100%',
            videoId: videoId,
            playerVars: {
                autoplay: autoplay ? 1 : 0,
                start: Math.floor(startTime)
            },
            events: {
                onReady: (event) => {
                    if (autoplay) {
                        event.target.playVideo();
                    }
                },
                onStateChange: onYouTubePlayerStateChange
            }
        });
    } else {
        youtubePlayer.loadVideoById({
            videoId: videoId,
            startSeconds: startTime
        });
        if (autoplay) {
            youtubePlayer.playVideo();
        }
    }
}

function onYouTubePlayerStateChange(event) {
    if (!isAdmin) return;
    
    const currentTime = youtubePlayer.getCurrentTime();
    
    if (event.data === YT.PlayerState.PLAYING) {
        socket.emit('youtube-play', {
            url: `https://www.youtube.com/watch?v=${youtubePlayer.getVideoData().video_id}`,
            currentTime: currentTime
        });
    } else if (event.data === YT.PlayerState.PAUSED) {
        socket.emit('youtube-pause', {
            currentTime: currentTime
        });
    }
}

function handleYouTubeSync(data) {
    if (!youtubePlayer) return;
    
    switch (data.action) {
        case 'play':
            if (data.url) {
                loadYouTubeVideo(data.url, data.currentTime, true);
            } else {
                youtubePlayer.seekTo(data.currentTime, true);
                youtubePlayer.playVideo();
            }
            break;
        case 'pause':
            youtubePlayer.seekTo(data.currentTime, true);
            youtubePlayer.pauseVideo();
            break;
        case 'seek':
            youtubePlayer.seekTo(data.currentTime, true);
            break;
    }
}

// Local media functionality
function loadLocalMedia(file) {
    document.getElementById('youtube-player-container').style.display = 'none';
    document.getElementById('local-player-container').style.display = 'block';
    document.getElementById('no-media-state').style.display = 'none';
    document.getElementById('file-select-area').style.display = 'none';
    
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    
    const videoPlayer = document.getElementById('local-video-player');
    const audioPlayer = document.getElementById('local-audio-player');
    
    if (isVideo) {
        videoPlayer.style.display = 'block';
        audioPlayer.style.display = 'none';
        localMediaElement = videoPlayer;
    } else if (isAudio) {
        videoPlayer.style.display = 'none';
        audioPlayer.style.display = 'block';
        localMediaElement = audioPlayer;
    }
    
    const fileURL = URL.createObjectURL(file);
    localMediaElement.src = fileURL;
    
    // Add event listeners for admin
    if (isAdmin) {
        localMediaElement.addEventListener('play', () => {
            socket.emit('local-media-play', {
                currentTime: localMediaElement.currentTime
            });
        });
        
        localMediaElement.addEventListener('pause', () => {
            socket.emit('local-media-pause', {
                currentTime: localMediaElement.currentTime
            });
        });
        
        localMediaElement.addEventListener('seeked', () => {
            socket.emit('local-media-seek', {
                currentTime: localMediaElement.currentTime
            });
        });
    }
}

function handleLocalMediaSync(data) {
    if (!localMediaElement) return;
    
    switch (data.action) {
        case 'play':
            localMediaElement.currentTime = data.currentTime;
            localMediaElement.play();
            break;
        case 'pause':
            localMediaElement.currentTime = data.currentTime;
            localMediaElement.pause();
            break;
        case 'seek':
            localMediaElement.currentTime = data.currentTime;
            break;
    }
}

function resetMediaPlayer() {
    document.getElementById('youtube-player-container').style.display = 'none';
    document.getElementById('local-player-container').style.display = 'none';
    document.getElementById('no-media-state').style.display = 'flex';
    document.getElementById('file-select-area').style.display = 'flex';
    
    if (youtubePlayer) {
        youtubePlayer.stopVideo();
    }
    
    if (localMediaElement) {
        localMediaElement.pause();
        localMediaElement.src = '';
    }
    
    localMediaElement = null;
}

// Modal management
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Emoji picker
function initializeEmojiPicker() {
    const emojis = [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
        '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
        '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
        '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
        '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
        '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
        '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
        '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
        '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧',
        '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
        '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑',
        '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻',
        '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸',
        '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋',
        '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞',
        '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇',
        '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏',
        '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳',
        '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃',
        '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋'
    ];
    
    const emojiGrid = document.getElementById('emoji-grid');
    emojiGrid.innerHTML = '';
    
    emojis.forEach(emoji => {
        const emojiElement = document.createElement('div');
        emojiElement.className = 'emoji-item';
        emojiElement.textContent = emoji;
        emojiElement.onclick = () => {
            sendEmoji(emoji);
            closeModal('emoji-modal');
        };
        emojiGrid.appendChild(emojiElement);
    });
}

// Join request management
function showJoinRequest(request) {
    const requestsList = document.getElementById('join-requests-list');
    
    const requestElement = document.createElement('div');
    requestElement.className = 'join-request-item';
    requestElement.id = `request-${request.userId}`;
    
    requestElement.innerHTML = `
        <div>
            <strong>${request.username}</strong> wants to join
        </div>
        <div class="request-actions">
            <button class="btn-approve" onclick="approveJoinRequest('${request.userId}', '${request.roomId}')">
                <i class="fas fa-check"></i> Approve
            </button>
            <button class="btn-reject" onclick="rejectJoinRequest('${request.userId}', '${request.roomId}')">
                <i class="fas fa-times"></i> Reject
            </button>
        </div>
    `;
    
    requestsList.appendChild(requestElement);
}

function approveJoinRequest(userId, roomId) {
    socket.emit('approve-join', { userId, roomId });
    document.getElementById(`request-${userId}`)?.remove();
}

function rejectJoinRequest(userId, roomId) {
    socket.emit('reject-join', { userId, roomId });
    document.getElementById(`request-${userId}`)?.remove();
}

// Utility functions
function copyRoomId() {
    const roomId = document.getElementById('room-id-display').textContent;
    navigator.clipboard.writeText(roomId).then(() => {
        showNotification('Room ID copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy room ID', 'error');
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    initializeEmojiPicker();
    
    // Welcome screen
    document.getElementById('join-app-btn').addEventListener('click', joinApp);
    document.getElementById('username-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinApp();
    });
    
    // Room screen
    document.getElementById('logout-btn').addEventListener('click', () => {
        location.reload();
    });
    
    document.querySelectorAll('.room-size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            createRoom(btn.dataset.size);
        });
    });
    
    document.getElementById('join-room-btn').addEventListener('click', joinRoom);
    document.getElementById('room-id-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinRoom();
    });
    
    // Chat screen
    document.getElementById('leave-room-btn').addEventListener('click', leaveRoom);
    document.getElementById('room-settings-btn').addEventListener('click', () => {
        openModal('room-settings-modal');
    });
    
    // Chat input
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    document.getElementById('emoji-btn').addEventListener('click', () => {
        openModal('emoji-modal');
    });
    
    document.getElementById('image-btn').addEventListener('click', () => {
        document.getElementById('image-input').click();
    });
    
    document.getElementById('image-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            sendImage(file);
        }
    });
    
    // Media controls
    document.getElementById('youtube-btn').addEventListener('click', () => {
        document.getElementById('youtube-player-container').style.display = 'block';
        document.getElementById('local-player-container').style.display = 'none';
        document.getElementById('no-media-state').style.display = 'none';
    });
    
    document.getElementById('local-file-btn').addEventListener('click', () => {
        document.getElementById('local-file-input').click();
    });
    
    document.getElementById('file-select-area').addEventListener('click', () => {
        document.getElementById('local-file-input').click();
    });
    
    document.getElementById('local-file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && (file.type.startsWith('video/') || file.type.startsWith('audio/'))) {
            loadLocalMedia(file);
        }
    });
    
    document.getElementById('load-youtube-btn').addEventListener('click', () => {
        const url = document.getElementById('youtube-url-input').value.trim();
        if (url) {
            loadYouTubeVideo(url, 0, true);
            socket.emit('youtube-play', { url: url, currentTime: 0 });
        }
    });
    
    // Room settings
    document.getElementById('copy-room-id').addEventListener('click', copyRoomId);
    
    // Modal close events
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            modal.classList.remove('active');
        });
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
});

// Handle page refresh/close
window.addEventListener('beforeunload', () => {
    if (socket) {
        socket.disconnect();
    }
});