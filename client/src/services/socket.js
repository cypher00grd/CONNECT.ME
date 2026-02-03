import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';

class SocketService {
  socket = null;
  listeners = new Map();

  connect(token) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('🟢 Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔴 Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // Room events
  joinRoom(roomId) {
    if (this.socket) {
      this.socket.emit('join_room', roomId);
    }
  }

  leaveRoom(roomId) {
    if (this.socket) {
      this.socket.emit('leave_room', roomId);
    }
  }

  // Chat events
  sendMessage(roomId, content) {
    if (this.socket) {
      this.socket.emit('send_message', { roomId, content });
    }
  }

  sendReaction(roomId, emoji) {
    if (this.socket) {
      this.socket.emit('send_reaction', { roomId, emoji });
    }
  }

  startTyping(roomId) {
    if (this.socket) {
      this.socket.emit('typing_start', roomId);
    }
  }

  stopTyping(roomId) {
    if (this.socket) {
      this.socket.emit('typing_stop', roomId);
    }
  }

  // Video call events
  startVideoCall(roomId) {
    if (this.socket) {
      this.socket.emit('video_call_start', roomId);
    }
  }

  joinVideoCall(roomId) {
    if (this.socket) {
      this.socket.emit('video_call_join', roomId);
    }
  }

  leaveVideoCall(roomId) {
    if (this.socket) {
      this.socket.emit('video_call_leave', roomId);
    }
  }

  sendVideoOffer(roomId, offer, targetUserId) {
    if (this.socket) {
      this.socket.emit('video_offer', { roomId, offer, targetUserId });
    }
  }

  sendVideoAnswer(answer, targetUserId) {
    if (this.socket) {
      this.socket.emit('video_answer', { answer, targetUserId });
    }
  }

  sendIceCandidate(candidate, targetUserId) {
    if (this.socket) {
      this.socket.emit('ice_candidate', { candidate, targetUserId });
    }
  }

  // Event listeners
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      
      // Track listeners for cleanup
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
        
        // Remove from tracked listeners
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
          const index = eventListeners.indexOf(callback);
          if (index > -1) {
            eventListeners.splice(index, 1);
          }
        }
      } else {
        this.socket.off(event);
        this.listeners.delete(event);
      }
    }
  }

  // Cleanup all listeners for a specific event
  removeAllListeners(event) {
    if (this.socket && event) {
      this.socket.removeAllListeners(event);
      this.listeners.delete(event);
    }
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;