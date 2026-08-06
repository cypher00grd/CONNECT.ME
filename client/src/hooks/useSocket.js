import { useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import socketService from '../services/socket';

import {
  addMessage,
  addParticipant,
  removeParticipant,
  setRoomEnded,
  addTypingUser,
  removeTypingUser,
  setVideoCallActive,
  addVideoCallParticipant,
  removeVideoCallParticipant,
  addRoom,
  updateRoom,
  updateSharedEditor,
} from '../redux/Slices/roomSlice';

import {
  addNotification,
  addVideoCallInvite,
} from '../redux/Slices/notificationSlice';

import {
  addIncomingPing,
  dismissIncomingPing,
  upsertTicket,
  setPendingReview,
  handleTicketAccepted as acceptTicketEvent,
  handleTicketClosed as closeTicketEvent,
  removeTicketEverywhere,
} from '../redux/Slices/ticketSlice';
import { upsertIssue } from '../redux/Slices/issueSlice';

const buildNotification = (type, message, payload = {}) => ({
  _id: `${type}-${payload.ticket?._id || payload.ticketId || Date.now()}`,
  type,
  message,
  ticket: payload.ticket,
  room: payload.room,
  sender: payload.sender || payload.helper || payload.requester || payload.ticket?.requester,
});

export const useSocket = (roomId = null, options = {}) => {
  const { listen = true } = options;
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const [isConnected, setIsConnected] = useState(socketService.isConnected());

  // Connect socket when token exists
  useEffect(() => {
    if (!token) {
      const resetConnectionState = window.setTimeout(() => setIsConnected(false), 0);
      return () => window.clearTimeout(resetConnectionState);
    }

    const socket = socketService.connect(token);
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [token]);

  // ROOM-SCOPED LISTENERS
  useEffect(() => {
    if (!listen || !roomId || !isConnected) return;

    socketService.joinRoom(roomId);

    // ----- MESSAGE -----
    const handleNewMessage = (msg) => dispatch(addMessage(msg));

    // ----- PARTICIPANTS -----
    const handleUserJoined = (data) => {
      dispatch(addParticipant({ roomId, user: data.user }));
    };

    const handleUserLeft = (data) => {
      dispatch(removeParticipant({ roomId, userId: data.userId }));
    };

    // ----- ROOM ENDED -----
    const handleRoomEnded = (data) => {
      dispatch(setRoomEnded(data.roomId));
    };

    // ----- TYPING -----
    const handleTypingStart = (data) => {
      dispatch(addTypingUser(data.username));
    };

    const handleTypingStop = (data) => {
      dispatch(removeTypingUser(data.username || data.userId));
    };

    // ----- VIDEO CALL -----
    const handleVideoCallStart = (data) => {
      dispatch(setVideoCallActive(true));
      dispatch(addVideoCallParticipant({ ...data, _id: data.userId }));
    };

    const handleVideoCallJoin = (data) => {
      dispatch(addVideoCallParticipant({ ...data, _id: data.userId }));
    };

    const handleVideoCallLeave = (data) => {
      dispatch(removeVideoCallParticipant(data.userId));
    };

    const handleEditorUpdated = (data) => {
      dispatch(updateSharedEditor(data));
    };

    // REGISTER ALL
    socketService.on('new_message', handleNewMessage);
    socketService.on('user_joined', handleUserJoined);
    socketService.on('user_joined_room', handleUserJoined);
    socketService.on('user_left', handleUserLeft);
    socketService.on('user_left_room', handleUserLeft);
    socketService.on('room_ended', handleRoomEnded);

    socketService.on('typing_start', handleTypingStart);
    socketService.on('user_typing', handleTypingStart);
    socketService.on('typing_stop', handleTypingStop);
    socketService.on('user_stopped_typing', handleTypingStop);

    socketService.on('video_started', handleVideoCallStart);
    socketService.on('new_video_participant', handleVideoCallJoin);
    socketService.on('video_participant_left', handleVideoCallLeave);
    socketService.on('room_editor_updated', handleEditorUpdated);

    return () => {
      socketService.leaveRoom(roomId);

      socketService.off('new_message', handleNewMessage);
      socketService.off('user_joined', handleUserJoined);
      socketService.off('user_joined_room', handleUserJoined);
      socketService.off('user_left', handleUserLeft);
      socketService.off('user_left_room', handleUserLeft);
      socketService.off('room_ended', handleRoomEnded);

      socketService.off('typing_start', handleTypingStart);
      socketService.off('user_typing', handleTypingStart);
      socketService.off('typing_stop', handleTypingStop);
      socketService.off('user_stopped_typing', handleTypingStop);

      socketService.off('video_started', handleVideoCallStart);
      socketService.off('new_video_participant', handleVideoCallJoin);
      socketService.off('video_participant_left', handleVideoCallLeave);
      socketService.off('room_editor_updated', handleEditorUpdated);
    };
  }, [roomId, dispatch, isConnected, listen]);

  // GLOBAL LISTENERS (NOT ROOM SPECIFIC)
  useEffect(() => {
    if (roomId || !isConnected) return;

    const handleNotification = (data) => {
      dispatch(addNotification(data));

      if (data.type === 'room_created' && data.room) {
        dispatch(addRoom(data.room));
      }
    };

    const handleVideoCallInvite = (data) => {
      dispatch(addVideoCallInvite(data));
    };

    const handleAnnouncement = (data) => {
      dispatch(addNotification(data));
    };

    const handleTicketPing = (data) => {
      dispatch(addIncomingPing(data));
      dispatch(addNotification(buildNotification(
        'ticket_ping',
        `New help ticket: ${data.ticket?.title || 'Someone needs help'}`,
        data
      )));
    };

    const handleTicketLocked = (data) => {
      dispatch(upsertTicket(data));
      dispatch(dismissIncomingPing(data.ticket?._id));
      dispatch(addNotification(buildNotification(
        'ticket_locked',
        'Ticket locked. Waiting for requester approval.',
        data
      )));
    };

    const handleTicketHelperLocked = (data) => {
      dispatch(setPendingReview(data));
      dispatch(addNotification(buildNotification(
        'ticket_helper_locked',
        `${data.helper?.displayName || 'A helper'} is ready to help.`,
        data
      )));
    };

    const handleTicketSearchResumed = (data) => {
      dispatch(upsertTicket(data));
      dispatch(addNotification(buildNotification(
        'ticket_search_resumed',
        'Ticket search resumed.',
        data
      )));
    };

    const handleTicketPaymentAuthorized = (data) => {
      dispatch(upsertTicket(data));
      dispatch(addNotification(buildNotification(
        'ticket_payment_authorized',
        'Ticket bounty authorized. Matching is live.',
        data
      )));
    };

    const handleTicketDirectWaiting = (data) => {
      dispatch(upsertTicket(data));
      dispatch(addNotification(buildNotification(
        'ticket_direct_waiting',
        data.message || 'Direct ticket is waiting for the helper.',
        data
      )));
    };

    const handleTicketSessionStarted = (data) => {
      dispatch(upsertTicket(data));
      if (data.ticket?.room?._id || data.ticket?.room) {
        const roomIdFromTicket = data.ticket.room?._id || data.ticket.room;
        dispatch(updateRoom({
          _id: roomIdFromTicket,
          ticket: data.ticket,
        }));
      }
    };

    const handleTicketAcceptedEvent = (data) => {
      dispatch(acceptTicketEvent(data));
      if (data.room) {
        dispatch(addRoom(data.room));
      }
      dispatch(addNotification(buildNotification(
        'ticket_accepted',
        'On-demand session accepted. Opening the room.',
        data
      )));
    };

    const buildTicketClosedHandler = (type, fallbackMessage) => (data) => {
      dispatch(closeTicketEvent(data));
      dispatch(addNotification(buildNotification(type, fallbackMessage, data)));
    };

    const handleTicketCancelled = buildTicketClosedHandler('ticket_cancelled', 'Ticket cancelled.');
    const handleTicketResolved = buildTicketClosedHandler('ticket_resolved', 'Ticket resolved.');
    const handleTicketRejected = (data) => {
      if (data?.remove) {
        dispatch(removeTicketEverywhere(data));
      } else {
        dispatch(closeTicketEvent(data));
      }
      dispatch(addNotification(buildNotification(
        'ticket_rejected',
        'Requester passed on this match.',
        data
      )));
    };

    const handleNoHelpers = (data) => {
      dispatch(addNotification(buildNotification(
        'ticket_no_helpers',
        data.message || 'No matching helpers are available right now.',
        data
      )));
    };

    const handleTicketError = (data) => {
      dispatch(addNotification(buildNotification(
        'ticket_error',
        data.message || 'Ticket action failed.',
        data
      )));
    };

    const handleIssueRequestCreated = (data) => {
      dispatch(upsertIssue(data));
      dispatch(addNotification(buildNotification(
        'issue_request_created',
        `${data.request?.resolver?.displayName || 'Someone'} wants to help with your issue.`,
        data
      )));
    };

    const handleIssueRequestApproved = (data) => {
      dispatch(upsertIssue(data));
      if (data.room) {
        dispatch(addRoom(data.room));
      }
      dispatch(addNotification(buildNotification(
        'issue_request_approved',
        'Issue session is ready.',
        data
      )));
    };

    const handleIssueRequestRejected = (data) => {
      dispatch(addNotification(buildNotification(
        'issue_request_rejected',
        'Your issue request was passed on.',
        data
      )));
    };

    const handleIssueResolved = (data) => {
      dispatch(upsertIssue(data));
      dispatch(addNotification(buildNotification(
        'issue_resolved',
        'Issue marked fixed.',
        data
      )));
    };

    socketService.on('notification', handleNotification);
    socketService.on('video_call_invite', handleVideoCallInvite);
    socketService.on('follower_announcement', handleAnnouncement);
    socketService.on('ticket_ping', handleTicketPing);
    socketService.on('ticket_locked', handleTicketLocked);
    socketService.on('ticket_helper_locked', handleTicketHelperLocked);
    socketService.on('ticket_search_resumed', handleTicketSearchResumed);
    socketService.on('ticket_payment_authorized', handleTicketPaymentAuthorized);
    socketService.on('ticket_direct_waiting', handleTicketDirectWaiting);
    socketService.on('ticket_session_started', handleTicketSessionStarted);
    socketService.on('ticket_accepted', handleTicketAcceptedEvent);
    socketService.on('ticket_cancelled', handleTicketCancelled);
    socketService.on('ticket_resolved', handleTicketResolved);
    socketService.on('ticket_rejected', handleTicketRejected);
    socketService.on('ticket_no_helpers_available', handleNoHelpers);
    socketService.on('ticket_error', handleTicketError);
    socketService.on('issue_request_created', handleIssueRequestCreated);
    socketService.on('issue_request_approved', handleIssueRequestApproved);
    socketService.on('issue_request_rejected', handleIssueRequestRejected);
    socketService.on('issue_resolved', handleIssueResolved);

    return () => {
      socketService.off('notification', handleNotification);
      socketService.off('video_call_invite', handleVideoCallInvite);
      socketService.off('follower_announcement', handleAnnouncement);
      socketService.off('ticket_ping', handleTicketPing);
      socketService.off('ticket_locked', handleTicketLocked);
      socketService.off('ticket_helper_locked', handleTicketHelperLocked);
      socketService.off('ticket_search_resumed', handleTicketSearchResumed);
      socketService.off('ticket_payment_authorized', handleTicketPaymentAuthorized);
      socketService.off('ticket_direct_waiting', handleTicketDirectWaiting);
      socketService.off('ticket_session_started', handleTicketSessionStarted);
      socketService.off('ticket_accepted', handleTicketAcceptedEvent);
      socketService.off('ticket_cancelled', handleTicketCancelled);
      socketService.off('ticket_resolved', handleTicketResolved);
      socketService.off('ticket_rejected', handleTicketRejected);
      socketService.off('ticket_no_helpers_available', handleNoHelpers);
      socketService.off('ticket_error', handleTicketError);
      socketService.off('issue_request_created', handleIssueRequestCreated);
      socketService.off('issue_request_approved', handleIssueRequestApproved);
      socketService.off('issue_request_rejected', handleIssueRequestRejected);
      socketService.off('issue_resolved', handleIssueResolved);
    };
  }, [dispatch, isConnected, roomId]);

  // ----- EMIT HELPERS -----
  const sendMessage = useCallback(
    (content, attachments = []) => roomId && socketService.sendMessage(roomId, content, attachments),
    [roomId]
  );

  const updateRoomEditor = useCallback(
    (editor, callback) => roomId && socketService.updateRoomEditor(roomId, editor, callback),
    [roomId]
  );

  const sendReaction = useCallback(
    (emoji) => roomId && socketService.sendReaction(roomId, emoji),
    [roomId]
  );

  const startTyping = useCallback(
    () => roomId && socketService.startTyping(roomId),
    [roomId]
  );

  const stopTyping = useCallback(
    () => roomId && socketService.stopTyping(roomId),
    [roomId]
  );

  const startVideoCall = useCallback(
    () => roomId && socketService.startVideoCall(roomId),
    [roomId]
  );

  const joinVideoCall = useCallback(
    () => roomId && socketService.joinVideoCall(roomId),
    [roomId]
  );

  const leaveVideoCall = useCallback(
    () => roomId && socketService.leaveVideoCall(roomId),
    [roomId]
  );

  return {
    socket: socketService.getSocket(),
    isConnected,

    sendMessage,
    updateRoomEditor,
    sendReaction,
    startTyping,
    stopTyping,

    startVideoCall,
    joinVideoCall,
    leaveVideoCall,
  };
};

export default useSocket;
