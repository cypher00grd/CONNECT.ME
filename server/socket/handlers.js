import Message from '../models/Message.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Ticket from '../models/Ticket.js';
import {
  approveLockedHelper,
  cancelTicket,
  dispatchDirectTicket,
  endTicketSessionEarly,
  lockTicketForHelper,
  markTicketSessionStarted,
  rejectLockedHelper,
  resolveTicket,
  serializeTicket,
  startTicketMatching
} from '../services/ticketMatchingService.js';
import {
  addHelperSkillCache,
  markUserOfflineSocket,
  markUserOnline
} from '../services/redisService.js';

const sameId = (left, right) => {
  if (!left || !right) return false;
  return (left._id || left).toString() === (right._id || right).toString();
};

const TICKET_SESSION_TYPES = new Set([
  'debugging',
  'code_review',
  'pair_programming',
  'architecture_review',
  'mentoring',
  'mock_interview',
  'deployment_help',
  'other'
]);
const TICKET_DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced']);

const hasRoomAccess = async (room, userId) => {
  const isCreator = sameId(room.creator?._id || room.creator, userId);
  if (isCreator) return true;

  if (room.type === 'live_event') {
    const booking = await Booking.exists({
      user: userId,
      room: room._id,
      paymentStatus: 'paid'
    });
    return !!booking;
  }

  if (room.type === 'vod_session' || room.type === 'issue_session') {
    return (room.participants || []).some((participant) => sameId(participant.user, userId));
  }

  return (room.creator?.followers || []).some((follower) => sameId(follower, userId));
};

const normalizeTags = (tags, limit = 5) => {
  if (!Array.isArray(tags)) return [];

  return [
    ...new Set(
      tags
        .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
        .filter(Boolean)
    )
  ].slice(0, limit);
};

const normalizeTicketSessionType = (value) => (
  typeof value === 'string' && TICKET_SESSION_TYPES.has(value.trim())
    ? value.trim()
    : 'debugging'
);

const normalizeTicketDifficulty = (value) => (
  typeof value === 'string' && TICKET_DIFFICULTIES.has(value.trim())
    ? value.trim()
    : 'intermediate'
);

const normalizeUrl = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:'].includes(parsed.protocol) ? trimmed : '';
  } catch {
    return '';
  }
};

const normalizeScreenshots = (screenshots) => {
  if (!Array.isArray(screenshots)) return [];

  return screenshots
    .map((screenshot) => ({
      url: typeof screenshot?.url === 'string' ? screenshot.url.trim() : '',
      name: typeof screenshot?.name === 'string' ? screenshot.name.trim() : '',
      size: Number.isFinite(Number(screenshot?.size)) ? Number(screenshot.size) : 0
    }))
    .filter((screenshot) => screenshot.url)
    .slice(0, 5);
};

const emitTicketResponse = (socket, callback, response) => {
  if (typeof callback === 'function') {
    callback(response);
    return;
  }

  if (response.success) {
    socket.emit(response.event, response.data);
    return;
  }

  socket.emit('ticket_error', {
    event: response.event,
    message: response.message
  });
};

const normalizeEditorPayload = (payload = {}) => ({
  title: typeof payload.title === 'string' ? payload.title.trim().slice(0, 80) || 'Scratchpad' : 'Scratchpad',
  language: typeof payload.language === 'string' ? payload.language.trim().toLowerCase().slice(0, 30) || 'javascript' : 'javascript',
  code: typeof payload.code === 'string' ? payload.code.slice(0, 20000) : ''
});

export const setupHandlers = (socket, io) => {
  // Join personal room for notifications
  socket.join(socket.user._id.toString());

  console.log(`✅ User connected: ${socket.user.username}`);

  // Update online status
  User.findByIdAndUpdate(socket.user._id, { isOnline: true }).exec();
  markUserOnline(socket.user._id.toString(), socket.id);
  addHelperSkillCache(socket.user);

  Ticket.find({
    visibility: 'direct',
    targetHelper: socket.user._id,
    status: 'direct_pending',
    paymentStatus: { $in: ['not_required', 'authorized', 'captured'] }
  })
    .limit(20)
    .then((tickets) => Promise.all(tickets.map((ticket) => dispatchDirectTicket(io, ticket._id))))
    .catch((error) => console.error('Direct pending ticket dispatch error:', error));

  // ============ ON-DEMAND TICKET EVENTS ============

  socket.on('create_ticket', async (payload = {}, callback) => {
    try {
      const title = typeof payload.title === 'string' ? payload.title.trim() : '';
      const description = typeof payload.description === 'string' ? payload.description.trim() : '';
      const tags = normalizeTags(payload.tags);
      const screenshots = normalizeScreenshots(payload.screenshots);
      const sessionType = normalizeTicketSessionType(payload.sessionType);
      const techStack = normalizeTags(payload.techStack, 8);
      const difficulty = normalizeTicketDifficulty(payload.difficulty);
      const repoUrl = normalizeUrl(payload.repoUrl);
      const errorContext = typeof payload.errorContext === 'string' ? payload.errorContext.trim() : '';
      const bountyAmount = Number(payload.bountyAmount || 0);
      const estimatedMinutes = [30, 60, 90, 120].includes(Number(payload.estimatedMinutes))
        ? Number(payload.estimatedMinutes)
        : 30;
      const targetHelperId = payload.targetHelper || payload.targetHelperId || null;

      if (!title || !description || tags.length === 0) {
        return emitTicketResponse(socket, callback, {
          success: false,
          event: 'ticket_created',
          message: 'Title, description, and at least one tag are required'
        });
      }

      if (!Number.isFinite(bountyAmount) || bountyAmount < 0) {
        return emitTicketResponse(socket, callback, {
          success: false,
          event: 'ticket_created',
          message: 'Bounty amount must be a valid non-negative number'
        });
      }

      if (bountyAmount > 0) {
        return emitTicketResponse(socket, callback, {
          success: false,
          event: 'ticket_created',
          message: 'Paid bounties must be created through the ticket form so Stripe Checkout can authorize the hold.'
        });
      }

      let targetHelper = null;
      if (targetHelperId) {
        targetHelper = await User.findById(targetHelperId).select('_id isInstructor').lean();
        if (!targetHelper?.isInstructor || sameId(targetHelper._id, socket.user._id)) {
          return emitTicketResponse(socket, callback, {
            success: false,
            event: 'ticket_created',
            message: 'Direct tickets can only target another available helper'
          });
        }
      }

      const ticket = await Ticket.create({
        requester: socket.user._id,
        title,
        description,
        tags,
        screenshots,
        sessionType,
        techStack,
        difficulty,
        repoUrl,
        errorContext,
        bountyAmount,
        estimatedMinutes,
        visibility: targetHelper ? 'direct' : 'public',
        targetHelper: targetHelper?._id || null,
        status: targetHelper ? 'direct_pending' : 'searching'
      });

      const populatedTicket = await Ticket.findById(ticket._id)
        .populate('requester', 'username displayName avatar skills rating reviewsCount')
        .populate('targetHelper', 'username displayName avatar bio skills isInstructor rating reviewsCount reputationPoints');
      const matchedHelpers = targetHelper
        ? [await dispatchDirectTicket(io, ticket._id)].filter(Boolean)
        : await startTicketMatching(io, ticket._id);
      const responseData = {
        ticket: serializeTicket(populatedTicket),
        matching: {
          pingedHelpers: matchedHelpers?.length || 0
        }
      };

      emitTicketResponse(socket, callback, {
        success: true,
        event: 'ticket_created',
        data: responseData
      });
    } catch (error) {
      console.error('Create ticket socket error:', error);
      emitTicketResponse(socket, callback, {
        success: false,
        event: 'ticket_created',
        message: 'Failed to create ticket'
      });
    }
  });

  socket.on('lock_ticket', async (payload = {}, callback) => {
    try {
      const ticketId = payload.ticketId || payload;
      const { ticket, message } = await lockTicketForHelper(io, ticketId, socket.user._id);

      emitTicketResponse(socket, callback, {
        success: !!ticket,
        event: 'ticket_locked',
        data: ticket ? { ticket: serializeTicket(ticket) } : null,
        message
      });
    } catch (error) {
      console.error('Lock ticket socket error:', error);
      emitTicketResponse(socket, callback, {
        success: false,
        event: 'ticket_locked',
        message: 'Failed to lock ticket'
      });
    }
  });

  socket.on('approve_helper', async (payload = {}, callback) => {
    try {
      const ticketId = payload.ticketId || payload;
      const { ticket, room, message } = await approveLockedHelper(io, ticketId, socket.user._id);

      emitTicketResponse(socket, callback, {
        success: !!ticket,
        event: 'ticket_accepted',
        data: ticket ? { ticket: serializeTicket(ticket), room } : null,
        message
      });
    } catch (error) {
      console.error('Approve helper socket error:', error);
      emitTicketResponse(socket, callback, {
        success: false,
        event: 'ticket_accepted',
        message: 'Failed to approve helper'
      });
    }
  });

  socket.on('reject_helper', async (payload = {}, callback) => {
    try {
      const ticketId = payload.ticketId || payload;
      const { ticket, message } = await rejectLockedHelper(io, ticketId, socket.user._id);

      emitTicketResponse(socket, callback, {
        success: !!ticket,
        event: 'ticket_search_resumed',
        data: ticket ? { ticket: serializeTicket(ticket) } : null,
        message
      });
    } catch (error) {
      console.error('Reject helper socket error:', error);
      emitTicketResponse(socket, callback, {
        success: false,
        event: 'ticket_search_resumed',
        message: 'Failed to reject helper'
      });
    }
  });

  socket.on('cancel_ticket', async (payload = {}, callback) => {
    try {
      const ticketId = payload.ticketId || payload;
      const { ticket, message } = await cancelTicket(io, ticketId, socket.user._id);

      emitTicketResponse(socket, callback, {
        success: !!ticket,
        event: 'ticket_cancelled',
        data: ticket ? { ticket: serializeTicket(ticket) } : null,
        message
      });
    } catch (error) {
      console.error('Cancel ticket socket error:', error);
      emitTicketResponse(socket, callback, {
        success: false,
        event: 'ticket_cancelled',
        message: 'Failed to cancel ticket'
      });
    }
  });

  socket.on('resolve_ticket', async (payload = {}, callback) => {
    try {
      const ticketId = payload.ticketId || payload;
      const { ticket, message } = await resolveTicket(io, ticketId, socket.user._id);

      emitTicketResponse(socket, callback, {
        success: !!ticket,
        event: 'ticket_resolved',
        data: ticket ? { ticket: serializeTicket(ticket) } : null,
        message
      });
    } catch (error) {
      console.error('Resolve ticket socket error:', error);
      emitTicketResponse(socket, callback, {
        success: false,
        event: 'ticket_resolved',
        message: 'Failed to resolve ticket'
      });
    }
  });

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

      const canJoin = await hasRoomAccess(room, socket.user._id);
      if (!canJoin) {
        const message = room.type === 'live_event'
          ? 'You must purchase a ticket to join this live event.'
          : room.type === 'vod_session' || room.type === 'issue_session'
            ? 'You are not a participant in this private session.'
            : 'Follow creator to join room';
        return socket.emit('error', { message });
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
  socket.on('send_message', async ({ roomId, content, attachments = [] }) => {
    try {
      const safeContent = typeof content === 'string' ? content.trim() : '';
      const safeAttachments = Array.isArray(attachments)
        ? attachments
          .map((attachment) => ({
            url: typeof attachment?.url === 'string' ? attachment.url.trim() : '',
            type: 'image',
            name: typeof attachment?.name === 'string' ? attachment.name.trim() : '',
            size: Number.isFinite(Number(attachment?.size)) ? Number(attachment.size) : 0
          }))
          .filter((attachment) => attachment.url)
          .slice(0, 5)
        : [];

      if (!safeContent && safeAttachments.length === 0) {
        return;
      }

      if (!socket.rooms.has(roomId)) {
        return socket.emit('error', { message: 'Join room first' });
      }

      const room = await Room.findById(roomId)
        .populate('creator', 'followers');

      if (!room || room.status !== 'active') {
        socket.emit('error', { message: 'Room not found or has ended' });
        return;
      }

      const canSend = await hasRoomAccess(room, socket.user._id);
      if (!canSend) {
        return socket.emit('error', { message: 'You do not have access to this room' });
      }

      const message = await Message.create({
        room: roomId,
        sender: socket.user._id,
        content: safeContent,
        attachments: safeAttachments,
        type: safeAttachments.length > 0 && !safeContent ? 'image' : 'text'
      });

      const populatedMessage = {
        _id: message._id,
        content: message.content,
        type: message.type,
        attachments: message.attachments || [],
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

  socket.on('update_room_editor', async (payload = {}, callback) => {
    try {
      const roomId = payload.roomId;
      if (!roomId || !socket.rooms.has(roomId)) {
        const response = { success: false, message: 'Join room first' };
        if (typeof callback === 'function') callback(response);
        return socket.emit('error', response);
      }

      const room = await Room.findById(roomId).populate('creator', 'followers');
      if (!room || room.status !== 'active') {
        const response = { success: false, message: 'Room not found or has ended' };
        if (typeof callback === 'function') callback(response);
        return socket.emit('error', response);
      }

      const canEdit = await hasRoomAccess(room, socket.user._id);
      if (!canEdit) {
        const response = { success: false, message: 'You do not have access to this room' };
        if (typeof callback === 'function') callback(response);
        return socket.emit('error', response);
      }

      const nextEditor = {
        ...normalizeEditorPayload(payload.editor || payload),
        updatedBy: socket.user._id,
        updatedAt: new Date()
      };

      room.sharedEditor = nextEditor;
      await room.save();

      const editorUpdate = {
        roomId,
        sharedEditor: {
          title: nextEditor.title,
          language: nextEditor.language,
          code: nextEditor.code,
          updatedAt: nextEditor.updatedAt,
          updatedBy: {
            _id: socket.user._id,
            username: socket.user.username,
            displayName: socket.user.displayName,
            avatar: socket.user.avatar
          }
        }
      };

      io.to(roomId).emit('room_editor_updated', editorUpdate);
      if (typeof callback === 'function') callback({ success: true, data: editorUpdate });
    } catch (error) {
      console.error('Update room editor error:', error);
      const response = { success: false, message: 'Failed to update shared editor' };
      if (typeof callback === 'function') callback(response);
      socket.emit('error', response);
    }
  });

  // Send reaction
  socket.on('send_reaction', ({ roomId, emoji }) => {
    if (!socket.rooms.has(roomId)) {
      return socket.emit('error', { message: 'Join room first' });
    }

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
    if (!socket.rooms.has(roomId)) return;

    socket.to(roomId).emit('user_typing', {
      userId: socket.user._id,
      username: socket.user.username
    });
  });

  socket.on('typing_stop', (roomId) => {
    if (!socket.rooms.has(roomId)) return;

    socket.to(roomId).emit('user_stopped_typing', {
      userId: socket.user._id,
      username: socket.user.username
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
  socket.on('join_video_call', async (roomId) => {
    console.log(`${socket.user.username} joined VIDEO CALL in room ${roomId}`);

    if (!socket.rooms.has(roomId)) {
      return socket.emit('error', { message: 'Join room first' });
    }

    socket.join(`${roomId}-video`);

    socket.to(`${roomId}-video`).emit('new_video_participant', {
      userId: socket.user._id,
      username: socket.user.username,
      displayName: socket.user.displayName,
      avatar: socket.user.avatar
    });

    // 🛡️ LATE JOINER FIX: Give the joining user the exhaustive current roster
    // so their local WebRTC engine knows exactly who to send connection offers to!
    try {
      const sockets = await io.in(`${roomId}-video`).fetchSockets();
      const existingParticipants = sockets
        .filter(s => s.id !== socket.id) // excluding themselves
        .map(s => s.user._id.toString());
      const uniqueParticipantIds = new Set(
        sockets.map((s) => s.user?._id?.toString()).filter(Boolean)
      );

      socket.emit('video_call_roster', existingParticipants);

      // Also fire 'video_started' retroactively just in case their Redux state missed the original broadcast
      if (existingParticipants.length > 0) {
        socket.emit('video_started', {
          userId: existingParticipants[0] // fallback placeholder
        });
      }

      if (uniqueParticipantIds.size >= 2) {
        await markTicketSessionStarted(io, roomId);
      }
    } catch (err) {
      console.error('Error fetching video sockets:', err);
    }
  });

  // 3. WebRTC Offer -> send to specific user
  socket.on('video_offer', ({ roomId, offer, targetUserId }) => {
    if (!socket.rooms.has(roomId)) {
      return socket.emit('error', { message: 'Join room first' });
    }

    if (targetUserId) {
      socket.to(targetUserId).emit('video_offer', {
        offer,
        from: socket.user._id
      });
    }
  });

  // 4. WebRTC Answer -> send to specific user
  socket.on('video_answer', ({ roomId, answer, targetUserId }) => {
    if (!socket.rooms.has(roomId)) {
      return socket.emit('error', { message: 'Join room first' });
    }

    if (targetUserId) {
      socket.to(targetUserId).emit('video_answer', {
        answer,
        from: socket.user._id
      });
    }
  });

  // 5. ICE Candidate -> send to specific user
  socket.on('ice_candidate', ({ roomId, candidate, targetUserId }) => {
    if (!socket.rooms.has(roomId)) {
      return socket.emit('error', { message: 'Join room first' });
    }

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

    endTicketSessionEarly(io, roomId, socket.user._id)
      .catch((error) => console.error('Ticket early-exit handling error:', error));
  });



  // ============ DISCONNECT ============

  socket.on('disconnect', async () => {
    console.log(`❌ User disconnected: ${socket.user.username}`);
    const remainingSockets = await markUserOfflineSocket(socket.user._id.toString(), socket.id);
    if (!remainingSockets) {
      await User.findByIdAndUpdate(socket.user._id, { isOnline: false });
    }
  });
};
