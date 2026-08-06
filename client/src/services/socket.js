// import { io } from 'socket.io-client';
// import { SOCKET_URL } from '../utils/constants';

// class SocketService {
//   socket = null;
//   listeners = new Map();

//   connect(token) {
//     if (this.socket?.connected) {
//       console.log('Socket already connected');
//       return this.socket;
//     }

//     this.socket = io(SOCKET_URL, {
//       auth: { token },
//       transports: ['websocket', 'polling'],
//       reconnection: true,
//       reconnectionAttempts: 5,
//       reconnectionDelay: 1000,
//     });

//     this.socket.on('connect', () => {
//       console.log('🟢 Socket connected:', this.socket.id);
//     });

//     this.socket.on('disconnect', (reason) => {
//       console.log('🔴 Socket disconnected:', reason);
//     });

//     this.socket.on('connect_error', (error) => {
//       console.error('❌ Socket connection error:', error.message);
//     });

//     this.socket.on('error', (error) => {
//       console.error('❌ Socket error:', error);
//     });

//     return this.socket;
//   }

//   disconnect() {
//     if (this.socket) {
//       this.socket.disconnect();
//       this.socket = null;
//       this.listeners.clear();
//     }
//   }

//   getSocket() {
//     return this.socket;
//   }

//   isConnected() {
//     return this.socket?.connected || false;
//   }

//   // Room events
//   joinRoom(roomId) {
//     if (this.socket) {
//       this.socket.emit('join_room', roomId);
//     }
//   }

//   leaveRoom(roomId) {
//     if (this.socket) {
//       this.socket.emit('leave_room', roomId);
//     }
//   }

//   // Chat events
//   sendMessage(roomId, content) {
//     if (this.socket) {
//       this.socket.emit('send_message', { roomId, content });
//     }
//   }

//   sendReaction(roomId, emoji) {
//     if (this.socket) {
//       this.socket.emit('send_reaction', { roomId, emoji });
//     }
//   }

//   startTyping(roomId) {
//     if (this.socket) {
//       this.socket.emit('typing_start', roomId);
//     }
//   }

//   stopTyping(roomId) {
//     if (this.socket) {
//       this.socket.emit('typing_stop', roomId);
//     }
//   }

//   // Video call events
//   startVideoCall(roomId) {
//     if (this.socket) {
//       this.socket.emit('video_started', roomId);
//     }
//   }

//   joinVideoCall(roomId) {
//     if (this.socket) {
//       this.socket.emit('join_video_call', roomId);
//     }
//   }

//   leaveVideoCall(roomId) {
//     if (this.socket) {
//       this.socket.emit('leave_video_call', roomId);
//     }
//   }

//   sendVideoOffer(roomId, offer, targetUserId) {
//     if (this.socket) {
//       this.socket.emit('video_offer', { roomId, offer, targetUserId });
//     }
//   }

//   sendVideoAnswer(answer, targetUserId) {
//     if (this.socket) {
//       this.socket.emit('video_answer', { answer, targetUserId });
//     }
//   }

//   sendIceCandidate(candidate, targetUserId) {
//     if (this.socket) {
//       this.socket.emit('ice_candidate', { candidate, targetUserId });
//     }
//   }

//   // Event listeners
//   on(event, callback) {
//     if (this.socket) {
//       this.socket.on(event, callback);

//       // Track listeners for cleanup
//       if (!this.listeners.has(event)) {
//         this.listeners.set(event, []);
//       }
//       this.listeners.get(event).push(callback);
//     }
//   }

//   off(event, callback) {
//     if (this.socket) {
//       if (callback) {
//         this.socket.off(event, callback);

//         // Remove from tracked listeners
//         const eventListeners = this.listeners.get(event);
//         if (eventListeners) {
//           const index = eventListeners.indexOf(callback);
//           if (index > -1) {
//             eventListeners.splice(index, 1);
//           }
//         }
//       } else {
//         this.socket.off(event);
//         this.listeners.delete(event);
//       }
//     }
//   }

//   // Cleanup all listeners for a specific event
//   removeAllListeners(event) {
//     if (this.socket && event) {
//       this.socket.removeAllListeners(event);
//       this.listeners.delete(event);
//     }
//   }
// }

// // Export singleton instance
// const socketService = new SocketService();
// export default socketService;




import { io } from "socket.io-client";
import { SOCKET_URL } from "../utils/constants";
import { getAccessToken, subscribeAccessToken } from "./api";

class SocketService {
  socket = null;
  listeners = new Map();

  constructor() {
    subscribeAccessToken((token) => {
      if (this.socket) {
        this.socket.auth = { token };
      }
    });
  }

  connect(token = getAccessToken()) {
    if (this.socket) {
      this.socket.auth = { token };
      if (!this.socket.connected && !this.socket.active) {
        this.socket.connect();
      }
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true,

    });

    this.socket.on("connect", () => {
      console.log("🟢 Socket connected:", this.socket?.id);
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.listeners.clear();
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // ROOM
  joinRoom(roomId) {
    this.socket?.emit("join_room", roomId);
  }

  leaveRoom(roomId) {
    this.socket?.emit("leave_room", roomId);
  }

  getSocket() {
    return this.socket;
  }

  // CHAT
  sendMessage(roomId, content, attachments = []) {
    this.socket?.emit('send_message', { roomId, content, attachments });
  }

  updateRoomEditor(roomId, editor, callback) {
    this.socket?.emit('update_room_editor', { roomId, editor }, callback);
  }

  sendReaction(roomId, emoji) {
    this.socket?.emit('send_reaction', { roomId, emoji });
  }

  startTyping(roomId) {
    this.socket?.emit('typing_start', roomId);
  }

  stopTyping(roomId) {
    this.socket?.emit('typing_stop', roomId);
  }

  // VIDEO
  startVideoCall(roomId) {
    this.socket?.emit("video_started", roomId);
  }

  joinVideoCall(roomId) {
    this.socket?.emit("join_video_call", roomId);
  }

  leaveVideoCall(roomId) {
    this.socket?.emit("leave_video_call", roomId);
  }

  sendVideoOffer(roomId, offer, targetUserId) {
    this.socket?.emit("video_offer", { roomId, offer, targetUserId });
  }

  sendVideoAnswer(roomId, answer, targetUserId) {
    this.socket?.emit("video_answer", { roomId, answer, targetUserId });
  }

  sendIceCandidate(roomId, candidate, targetUserId) {
    this.socket?.emit("ice_candidate", { roomId, candidate, targetUserId });
  }

  // ON-DEMAND TICKETS
  createTicket(data, callback) {
    this.socket?.emit("create_ticket", data, callback);
  }

  lockTicket(ticketId, callback) {
    this.socket?.emit("lock_ticket", { ticketId }, callback);
  }

  approveHelper(ticketId, callback) {
    this.socket?.emit("approve_helper", { ticketId }, callback);
  }

  rejectHelper(ticketId, callback) {
    this.socket?.emit("reject_helper", { ticketId }, callback);
  }

  cancelTicket(ticketId, callback) {
    this.socket?.emit("cancel_ticket", { ticketId }, callback);
  }

  resolveTicket(ticketId, callback) {
    this.socket?.emit("resolve_ticket", { ticketId }, callback);
  }

  on(event, cb) {
    this.socket?.on(event, cb);

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(cb);
  }

  off(event, cb) {
    if (!this.socket) return;

    if (!cb) {
      this.socket.off(event);
      this.listeners.delete(event);
      return;
    }

    this.socket.off(event, cb);
    const callbacks = this.listeners.get(event) || [];
    this.listeners.set(event, callbacks.filter((listener) => listener !== cb));
  }
}

export default new SocketService();
