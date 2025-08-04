# 🎬 MediaSync Chat - Real-Time Media Sharing & Group Chat

A beautiful real-time media-sharing and group chat web application built with **HTML, CSS, JavaScript** (frontend) and **Node.js + Express + Socket.IO** (backend).

## 🌟 Features

### ✨ **Real-Time Group Chat**
- Real-time messaging using Socket.IO
- Emoji support with beautiful picker
- Image sharing (base64 preview)
- Modern dark theme UI with animations
- Chat layout similar to WhatsApp Web/Discord
- Medium-sized chat box with maximum space for media player

### 🎥 **Media Watch Together**

#### **YouTube Sync**
- Paste YouTube video URLs to watch together
- Uses YouTube IFrame Player API
- Real-time sync of `play`, `pause`, and `seek` actions
- Admin controls playback for everyone in the room

#### **Local File Playback Sync**
- Select video/audio files from device (MP4, MP3, etc.)
- HTML5 `<video>` and `<audio>` tag support
- Sync playback, pause, and seek time across all users
- No file upload needed - just synced timestamps

### 🏠 **Room & Admin System**
- Rooms limited to 2, 4, or 6 people
- Room creator (admin) can:
  - Approve join requests
  - Remove members
  - Control video/audio playback
  - Share room invite link (6-character room ID)

### 🎨 **Design & UI**
- Beautiful dark mode with neon accents
- Fully responsive design (mobile-friendly)
- Smooth animations and transitions
- Discord/Netflix-inspired modern UI
- Glassmorphism effects and gradients

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone or download the project**
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   For development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
/
├── public/
│   ├── index.html          # Main HTML file
│   ├── style.css           # CSS styling
│   └── script.js           # Frontend JavaScript
├── server/
│   └── server.js           # Express + Socket.IO server
├── package.json            # Dependencies
├── .env                    # Environment variables
└── README.md              # This file
```

## 🎮 How to Use

### 1. **Join the App**
- Enter your username on the welcome screen
- Click "Join App"

### 2. **Create or Join a Room**
- **Create Room:** Choose room size (2, 4, or 6 people)
- **Join Room:** Enter a 6-character room ID

### 3. **Chat Features**
- Type messages in the chat input
- Click emoji button for emoji picker
- Click image button to share images
- Messages appear in real-time for all users

### 4. **Media Features (Admin Only)**
- **YouTube:** Click "YouTube" button, paste URL, click "Load"
- **Local Files:** Click "Local File" button, select video/audio file
- All users will see synchronized playback

### 5. **Room Management (Admin Only)**
- Approve/reject join requests via settings modal
- Remove users from the room
- Copy room ID to share with others

## 🛠️ Tech Stack

### Frontend
- **HTML5** - Structure and semantic markup
- **CSS3** - Modern styling with Flexbox/Grid
- **Vanilla JavaScript** - No frameworks, pure JS
- **Font Awesome** - Icons
- **YouTube IFrame API** - YouTube video embedding

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **CORS** - Cross-origin requests
- **dotenv** - Environment variables

## 🔧 Configuration

### Environment Variables (.env)
```env
PORT=3000
NODE_ENV=development
```

### Server Configuration
- **Port:** 3000 (configurable via PORT env variable)
- **CORS:** Enabled for all origins
- **File Upload Limit:** 50MB for images

## 📱 Mobile Support

The app is fully responsive and works great on:
- Desktop browsers
- Tablets
- Mobile phones (iOS/Android)

Mobile optimizations include:
- Touch-friendly buttons
- Optimized layout for small screens
- Mobile-specific media controls

## 🚀 Deployment

### Frontend (Vercel/Netlify)
1. Build the frontend assets
2. Deploy the `public/` folder
3. Update Socket.IO connection URL

### Backend (Render/Railway/Heroku)
1. Deploy the entire project
2. Set environment variables
3. Ensure PORT is properly configured

## 🔒 Security Features

- Input validation and sanitization
- XSS protection for chat messages
- Room access control with admin approval
- File type validation for uploads

## 🎯 Browser Compatibility

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ✅ Mobile browsers

## 📝 API Events

### Client → Server
- `join-app` - User joins with username
- `create-room` - Create new room
- `join-room-request` - Request to join room
- `send-message` - Send chat message
- `youtube-play/pause/seek` - YouTube controls
- `local-media-play/pause/seek` - Local media controls

### Server → Client
- `join-success` - User successfully joined
- `room-created` - Room created successfully
- `new-message` - New chat message received
- `youtube-sync` - YouTube playback sync
- `local-media-sync` - Local media sync
- `user-joined/left` - User status updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🐛 Known Issues

- YouTube API requires HTTPS in production
- Large media files may cause sync delays
- Mobile browsers may have autoplay restrictions

## 💡 Future Enhancements

- [ ] Screen sharing support
- [ ] Voice chat integration
- [ ] File upload for permanent media storage
- [ ] User authentication and profiles
- [ ] Room persistence and history
- [ ] Multiple simultaneous media sources
- [ ] Playlist support
- [ ] Custom emoji reactions

---

**Enjoy watching and chatting together! 🎉**