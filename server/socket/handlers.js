import Message from '../models/Message.js';
import Room from '../models/Room.js';
import User from '../models/User.js';

export const setupHandlers = (socket, io) => {
  // Join personal room for notifications
  socket.join(socket.user._id.toString());

  console.log(`✅ User connected: ${socket.user.username}`);

  // Update online status
  User.findByIdAndUpdate(socket.user._id, { isOnline: true }).exec();

  // ============ ROOM EVENTS ============

  // Join a room
  socket.on('join_room', async (roomId) => {
    try {
      const room = await Room.findById(roomId)
        .populate('creator', 'followers');

      if (!room || room.status !== 'active') {
        socket.emit('error', { message: 'Room not found or  ended' });
        return;
      }
      // validate followerr rule -- if followed thn only can join rrom
      const isCreator = room.creator._id.toString() === socket.user._id.toString();
      const isFollower = room.creator.followers.some(
        f => f.toString() === socket.user._id.toString()
      );

      if (!isCreator && !isFollower) {
        return socket.emit('error', { message: 'Follow creator to join room' });
      }

      socket.join(roomId);
      console.log(`${socket.user.username} joined room: ${roomId}`);

      // Notify others in room
      socket.to(roomId).emit('user_joined_room', {
        user: {
          _id: socket.user._id,
          username: socket.user.username,
          displayName: socket.user.displayName,
          avatar: socket.user.avatar
        }
      });
    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Leave a room
  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`${socket.user.username} left room: ${roomId}`);

    socket.to(roomId).emit('user_left_room', {
      userId: socket.user._id,
      username: socket.user.username
    });
  });

  // ============ CHAT EVENTS ============

  // Send message
  socket.on('send_message', async ({ roomId, content }) => {
    try {
      if (!content || !content.trim()) {
        return;
      }

      const room = await Room.findById(roomId);

      if (!room || room.status !== 'active') {
        socket.emit('error', { message: 'Room not found or has ended' });
        return;
      }

      const message = await Message.create({
        room: roomId,
        sender: socket.user._id,
        content: content.trim(),
        type: 'text'
      });

      const populatedMessage = {
        _id: message._id,
        content: message.content,
        type: message.type,
        createdAt: message.createdAt,
        sender: {
          _id: socket.user._id,
          username: socket.user.username,
          displayName: socket.user.displayName,
          avatar: socket.user.avatar
        }
      };

      // Send to all in room including sender
      io.to(roomId).emit('new_message', populatedMessage);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Send reaction
  socket.on('send_reaction', ({ roomId, emoji }) => {
    io.to(roomId).emit('new_reaction', {
      emoji,
      id: Date.now(),
      user: {
        _id: socket.user._id,
        username: socket.user.username,
        displayName: socket.user.displayName
      }
    });
  });

  // Typing indicator
  socket.on('typing_start', (roomId) => {
    socket.to(roomId).emit('user_typing', {
      userId: socket.user._id,
      username: socket.user.username
    });
  });

  socket.on('typing_stop', (roomId) => {
    socket.to(roomId).emit('user_stopped_typing', {
      userId: socket.user._id
    });
  });

  // ============ VIDEO CALL EVENTS ============

  //   socket.on('video_offer', ({ roomId, offer, targetUserId }) => {
  //     io.to(targetUserId).emit('video_offer', {
  //       offer,
  //       from: socket.user._id,
  //       fromUser: {
  //         _id: socket.user._id,
  //         username: socket.user.username,
  //         displayName: socket.user.displayName
  //       }
  //     });
  //   });

  //   socket.on('video_answer', ({ answer, targetUserId }) => {
  //     io.to(targetUserId).emit('video_answer', {
  //       answer,
  //       from: socket.user._id
  //     });
  //   });

  //   socket.on('ice_candidate', ({ candidate, targetUserId }) => {
  //     io.to(targetUserId).emit('ice_candidate', {
  //       candidate,
  //       from: socket.user._id
  //     });
  //  });

  // ============ VIDEO CALL EVENTS ============
  // implement the broadcast service inside the room -- using webRTC (mesh topology --n*(n+1))
  // later will implement SFU for  scalability.

  // 1. Someone turns ON camera -> notify everyone in the room
  socket.on('video_started', (roomId) => {
    console.log(`${socket.user.username} started video in room ${roomId}`);

    if (!socket.rooms.has(roomId)) {
      return socket.emit('error', { message: 'Join room first' });
    }

    socket.to(roomId).emit('video_started', {
      userId: socket.user._id,
      username: socket.user.username,
      displayName: socket.user.displayName,
      avatar: socket.user.avatar
    });
  });

  // 2. User joins video call (not the room)
  socket.on('join_video_call', (roomId) => {
    console.log(`${socket.user.username} joined VIDEO CALL in room ${roomId}`);

    socket.join(`${roomId}-video`);

    socket.to(`${roomId}-video`).emit('new_video_participant', {
      userId: socket.user._id,
      username: socket.user.username,
      displayName: socket.user.displayName,
      avatar: socket.user.avatar
    });
  });

  // 3. WebRTC Offer -> send to specific user
  socket.on('video_offer', ({ roomId, offer, targetUserId }) => {
    if (targetUserId) {
      socket.to(targetUserId).emit('video_offer', {
        offer,
        from: socket.user._id
      });
    }
  });

  // 4. WebRTC Answer -> send to specific user
  socket.on('video_answer', ({ roomId, answer, targetUserId }) => {
    if (targetUserId) {
      socket.to(targetUserId).emit('video_answer', {
        answer,
        from: socket.user._id
      });
    }
  });

  // 5. ICE Candidate -> send to specific user
  socket.on('ice_candidate', ({ roomId, candidate, targetUserId }) => {
    if (targetUserId) {
      socket.to(targetUserId).emit('ice_candidate', {
        candidate,
        from: socket.user._id
      });
    }
  });

  // 6. User LEAVES the video call
  socket.on('leave_video_call', (roomId) => {
    console.log(`${socket.user.username} left VIDEO CALL: ${roomId}`);

    socket.leave(`${roomId}-video`);

    socket.to(`${roomId}-video`).emit('video_participant_left', {
      userId: socket.user._id
    });
  });



  // ============ DISCONNECT ============

  socket.on('disconnect', async () => {
    console.log(`❌ User disconnected: ${socket.user.username}`);
    await User.findByIdAndUpdate(socket.user._id, { isOnline: false });
  });
};