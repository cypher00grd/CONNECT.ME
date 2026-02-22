import { useEffect, useCallback } from 'react';
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
} from '../redux/Slices/roomSlice';

import {
  addNotification,
  addVideoCallInvite,
} from '../redux/Slices/notificationSlice';

export const useSocket = (roomId = null) => {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);

  // Connect socket when token exists
  useEffect(() => {
    if (token && !socketService.isConnected()) {
      socketService.connect(token);
    }
  }, [token]);

  // ROOM-SCOPED LISTENERS
  useEffect(() => {
    if (!roomId || !socketService.isConnected()) return;

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
      dispatch(removeTypingUser(data.userId));
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

    // REGISTER ALL
    socketService.on('new_message', handleNewMessage);
    socketService.on('user_joined', handleUserJoined);
    socketService.on('user_left', handleUserLeft);
    socketService.on('room_ended', handleRoomEnded);

    socketService.on('typing_start', handleTypingStart);
    socketService.on('typing_stop', handleTypingStop);

    socketService.on('video_started', handleVideoCallStart);
    socketService.on('new_video_participant', handleVideoCallJoin);
    socketService.on('video_participant_left', handleVideoCallLeave);

    return () => {
      socketService.leaveRoom(roomId);

      socketService.off('new_message', handleNewMessage);
      socketService.off('user_joined', handleUserJoined);
      socketService.off('user_left', handleUserLeft);
      socketService.off('room_ended', handleRoomEnded);

      socketService.off('typing_start', handleTypingStart);
      socketService.off('typing_stop', handleTypingStop);

      socketService.off('video_started', handleVideoCallStart);
      socketService.off('new_video_participant', handleVideoCallJoin);
      socketService.off('video_participant_left', handleVideoCallLeave);
    };
  }, [roomId, dispatch]);

  // GLOBAL LISTENERS (NOT ROOM SPECIFIC)
  useEffect(() => {
    if (!socketService.isConnected()) return;

    const handleNotification = (data) => {
      dispatch(addNotification(data));

      if (data.type === 'room_created' && data.room) {
        dispatch(addRoom(data.room));
      }
    };

    const handleVideoCallInvite = (data) => {
      dispatch(addVideoCallInvite(data));
    };

    socketService.on('notification', handleNotification);
    socketService.on('video_call_invite', handleVideoCallInvite);

    return () => {
      socketService.off('notification', handleNotification);
      socketService.off('video_call_invite', handleVideoCallInvite);
    };
  }, [dispatch]);

  // ----- EMIT HELPERS -----
  const sendMessage = useCallback(
    (content) => roomId && socketService.sendMessage(roomId, content),
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
    isConnected: socketService.isConnected(),

    sendMessage,
    sendReaction,
    startTyping,
    stopTyping,

    startVideoCall,
    joinVideoCall,
    leaveVideoCall,
  };
};

export default useSocket;
