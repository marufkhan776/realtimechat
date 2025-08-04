const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Store rooms and users
const rooms = new Map();
const users = new Map();

// Room management functions
function createRoom(roomId, creatorId, maxUsers = 6) {
  rooms.set(roomId, {
    id: roomId,
    creator: creatorId,
    users: [creatorId],
    maxUsers: maxUsers,
    joinRequests: [],
    media: {
      type: null, // 'youtube' or 'local'
      url: null,
      currentTime: 0,
      isPlaying: false,
      lastUpdate: Date.now()
    },
    messages: []
  });
}

function joinRoom(roomId, userId) {
  const room = rooms.get(roomId);
  if (room && room.users.length < room.maxUsers) {
    room.users.push(userId);
    return true;
  }
  return false;
}

function leaveRoom(roomId, userId) {
  const room = rooms.get(roomId);
  if (room) {
    room.users = room.users.filter(id => id !== userId);
    room.joinRequests = room.joinRequests.filter(id => id !== userId);
    
    // If creator leaves, assign new creator or delete room
    if (room.creator === userId) {
      if (room.users.length > 0) {
        room.creator = room.users[0];
      } else {
        rooms.delete(roomId);
        return null;
      }
    }
    return room;
  }
  return null;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins with username
  socket.on('join-app', (userData) => {
    users.set(socket.id, {
      id: socket.id,
      username: userData.username,
      roomId: null
    });
    
    socket.emit('join-success', {
      userId: socket.id,
      username: userData.username
    });
  });

  // Create room
  socket.on('create-room', (data) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const user = users.get(socket.id);
    
    if (user) {
      createRoom(roomId, socket.id, data.maxUsers);
      user.roomId = roomId;
      socket.join(roomId);
      
      socket.emit('room-created', {
        roomId: roomId,
        isCreator: true
      });
    }
  });

  // Join room request
  socket.on('join-room-request', (data) => {
    const room = rooms.get(data.roomId);
    const user = users.get(socket.id);
    
    if (room && user && !room.users.includes(socket.id)) {
      if (room.users.length >= room.maxUsers) {
        socket.emit('room-full');
        return;
      }
      
      room.joinRequests.push(socket.id);
      
      // Notify room creator
      const creatorSocket = io.sockets.sockets.get(room.creator);
      if (creatorSocket) {
        creatorSocket.emit('join-request', {
          userId: socket.id,
          username: user.username,
          roomId: data.roomId
        });
      }
    }
  });

  // Approve join request
  socket.on('approve-join', (data) => {
    const room = rooms.get(data.roomId);
    const user = users.get(socket.id);
    
    if (room && user && room.creator === socket.id) {
      const requestingUser = users.get(data.userId);
      if (requestingUser && room.joinRequests.includes(data.userId)) {
        joinRoom(data.roomId, data.userId);
        requestingUser.roomId = data.roomId;
        
        const requestingSocket = io.sockets.sockets.get(data.userId);
        if (requestingSocket) {
          requestingSocket.join(data.roomId);
          requestingSocket.emit('join-approved', {
            roomId: data.roomId,
            isCreator: false
          });
        }
        
        // Notify all room members
        io.to(data.roomId).emit('user-joined', {
          userId: data.userId,
          username: requestingUser.username,
          users: room.users.map(id => ({
            id: id,
            username: users.get(id)?.username || 'Unknown'
          }))
        });
      }
    }
  });

  // Reject join request
  socket.on('reject-join', (data) => {
    const room = rooms.get(data.roomId);
    const user = users.get(socket.id);
    
    if (room && user && room.creator === socket.id) {
      room.joinRequests = room.joinRequests.filter(id => id !== data.userId);
      
      const requestingSocket = io.sockets.sockets.get(data.userId);
      if (requestingSocket) {
        requestingSocket.emit('join-rejected');
      }
    }
  });

  // Send chat message
  socket.on('send-message', (data) => {
    const user = users.get(socket.id);
    if (user && user.roomId) {
      const room = rooms.get(user.roomId);
      if (room) {
        const message = {
          id: Date.now().toString(),
          userId: socket.id,
          username: user.username,
          content: data.content,
          type: data.type || 'text', // 'text', 'image', 'emoji'
          timestamp: new Date().toISOString()
        };
        
        room.messages.push(message);
        io.to(user.roomId).emit('new-message', message);
      }
    }
  });

  // YouTube media control
  socket.on('youtube-play', (data) => {
    const user = users.get(socket.id);
    if (user && user.roomId) {
      const room = rooms.get(user.roomId);
      if (room && room.creator === socket.id) {
        room.media = {
          type: 'youtube',
          url: data.url,
          currentTime: data.currentTime || 0,
          isPlaying: true,
          lastUpdate: Date.now()
        };
        
        socket.to(user.roomId).emit('youtube-sync', {
          action: 'play',
          url: data.url,
          currentTime: data.currentTime || 0
        });
      }
    }
  });

  socket.on('youtube-pause', (data) => {
    const user = users.get(socket.id);
    if (user && user.roomId) {
      const room = rooms.get(user.roomId);
      if (room && room.creator === socket.id) {
        room.media.isPlaying = false;
        room.media.currentTime = data.currentTime || 0;
        room.media.lastUpdate = Date.now();
        
        socket.to(user.roomId).emit('youtube-sync', {
          action: 'pause',
          currentTime: data.currentTime || 0
        });
      }
    }
  });

  socket.on('youtube-seek', (data) => {
    const user = users.get(socket.id);
    if (user && user.roomId) {
      const room = rooms.get(user.roomId);
      if (room && room.creator === socket.id) {
        room.media.currentTime = data.currentTime;
        room.media.lastUpdate = Date.now();
        
        socket.to(user.roomId).emit('youtube-sync', {
          action: 'seek',
          currentTime: data.currentTime
        });
      }
    }
  });

  // Local media control
  socket.on('local-media-play', (data) => {
    const user = users.get(socket.id);
    if (user && user.roomId) {
      const room = rooms.get(user.roomId);
      if (room && room.creator === socket.id) {
        room.media = {
          type: 'local',
          url: null,
          currentTime: data.currentTime || 0,
          isPlaying: true,
          lastUpdate: Date.now()
        };
        
        socket.to(user.roomId).emit('local-media-sync', {
          action: 'play',
          currentTime: data.currentTime || 0
        });
      }
    }
  });

  socket.on('local-media-pause', (data) => {
    const user = users.get(socket.id);
    if (user && user.roomId) {
      const room = rooms.get(user.roomId);
      if (room && room.creator === socket.id) {
        room.media.isPlaying = false;
        room.media.currentTime = data.currentTime || 0;
        room.media.lastUpdate = Date.now();
        
        socket.to(user.roomId).emit('local-media-sync', {
          action: 'pause',
          currentTime: data.currentTime || 0
        });
      }
    }
  });

  socket.on('local-media-seek', (data) => {
    const user = users.get(socket.id);
    if (user && user.roomId) {
      const room = rooms.get(user.roomId);
      if (room && room.creator === socket.id) {
        room.media.currentTime = data.currentTime;
        room.media.lastUpdate = Date.now();
        
        socket.to(user.roomId).emit('local-media-sync', {
          action: 'seek',
          currentTime: data.currentTime
        });
      }
    }
  });

  // Get room state
  socket.on('get-room-state', () => {
    const user = users.get(socket.id);
    if (user && user.roomId) {
      const room = rooms.get(user.roomId);
      if (room) {
        socket.emit('room-state', {
          roomId: room.id,
          isCreator: room.creator === socket.id,
          users: room.users.map(id => ({
            id: id,
            username: users.get(id)?.username || 'Unknown'
          })),
          messages: room.messages,
          media: room.media
        });
      }
    }
  });

  // Remove user from room
  socket.on('remove-user', (data) => {
    const user = users.get(socket.id);
    if (user && user.roomId) {
      const room = rooms.get(user.roomId);
      if (room && room.creator === socket.id) {
        const targetUser = users.get(data.userId);
        if (targetUser) {
          targetUser.roomId = null;
          leaveRoom(user.roomId, data.userId);
          
          const targetSocket = io.sockets.sockets.get(data.userId);
          if (targetSocket) {
            targetSocket.leave(user.roomId);
            targetSocket.emit('removed-from-room');
          }
          
          io.to(user.roomId).emit('user-left', {
            userId: data.userId,
            username: targetUser.username,
            users: room.users.map(id => ({
              id: id,
              username: users.get(id)?.username || 'Unknown'
            }))
          });
        }
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const user = users.get(socket.id);
    if (user && user.roomId) {
      const room = leaveRoom(user.roomId, socket.id);
      if (room) {
        socket.to(user.roomId).emit('user-left', {
          userId: socket.id,
          username: user.username,
          users: room.users.map(id => ({
            id: id,
            username: users.get(id)?.username || 'Unknown'
          }))
        });
      }
    }
    
    users.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});