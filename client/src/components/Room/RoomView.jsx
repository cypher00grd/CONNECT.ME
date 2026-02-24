import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import RoomHeader from './RoomHeader';
import Chat from './Chat';
import VideoCallModal from '../VideoCall/VideoCallModal';
import VideoGrid from '../VideoCall/VideoGrid';
import VideoControls from '../VideoCall/VideoControls';
import { PageLoader } from '../common/Loader';
import EmptyState from '../common/EmptyState';
import Button from '../common/Button';
import {
  getRoom,
  joinRoom,
  leaveRoom,
  endRoom,
  getRoomMessages,
  clearCurrentRoom
} from '../../redux/Slices/roomSlice';
import useAuth from '../../hooks/useAuth';
import useSocket from '../../hooks/useSocket';
import useVideoCall from '../../hooks/useVideoCall';
import { isRoomCreator } from '../../utils/helpers';
import { AlertTriangle, Home } from 'lucide-react';

const RoomView = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userId, user } = useAuth();

  const {
    currentRoom: room,
    isLoading,
    isError,
    message,
    videoCallActive,
    videoCallParticipants
  } = useSelector((state) => state.rooms);

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [roomEnded, setRoomEnded] = useState(false);

  // Initialize socket connection for this room
  useSocket(roomId);

  // Video call hook
  const isSpectator = room ? (!isRoomCreator(room, userId) && room.type === 'live_event') : false;
  const videoCall = useVideoCall(roomId, isSpectator);

  // Fetch room data and join
  useEffect(() => {
    if (roomId) {
      dispatch(getRoom(roomId));
      dispatch(getRoomMessages(roomId));
    }

    return () => {
      dispatch(clearCurrentRoom());
    };
  }, [roomId, dispatch]);

  // Join room when loaded
  useEffect(() => {
    if (room && room.status === 'active' && !roomEnded) {
      dispatch(joinRoom(roomId));

      // Auto-join video call for live events
      if (room.type === 'live_event') {
        // If Creator and call not active yet, initialize the room's WebRTC mesh.
        // If spectator, bind to the existing stream.
        if (isCreator && !videoCallActive) {
          videoCall.startCall();
        } else if (!isCreator) {
          videoCall.joinCall();
        }
      }
    }
  }, [room?._id, room?.status]);

  // Handle room ended
  useEffect(() => {
    if (room?.status === 'ended') {
      setRoomEnded(true);
    }
  }, [room?.status]);

  const handleLeave = async () => {
    await dispatch(leaveRoom(roomId));
    navigate('/');
  };

  const handleEnd = async () => {
    if (window.confirm('Are you sure you want to end this room?')) {
      await dispatch(endRoom(roomId));
      navigate('/');
    }
  };

  const handleStartVideoCall = () => {
    if (videoCallActive) {
      // Join existing call
      setShowVideoModal(true);
    } else {
      // Start new call - this will notify all participants
      videoCall.startCall();
      setShowVideoModal(true);
    }
  };

  const isCreator = room && isRoomCreator(room, userId);

  // Loading state
  if (isLoading && !room) {
    return <PageLoader />;
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <EmptyState
          icon={<AlertTriangle size={32} />}
          title="Room not accessible"
          description={message || "You don't have access to this room. You may need to follow the creator first."}
          action={
            <Button onClick={() => navigate('/')} leftIcon={<Home size={18} />}>
              Go Home
            </Button>
          }
        />
      </div>
    );
  }

  // Room ended state
  if (roomEnded || room?.status === 'ended') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <EmptyState
          icon={<AlertTriangle size={32} />}
          title="Room has ended"
          description="This room is no longer active."
          action={
            <Button onClick={() => navigate('/')} leftIcon={<Home size={18} />}>
              Go Home
            </Button>
          }
        />
      </div>
    );
  }

  if (!room) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-dark-900">
      {/* Header */}
      <RoomHeader
        room={room}
        isCreator={isCreator}
        onLeave={handleLeave}
        onEnd={handleEnd}
        onStartVideoCall={handleStartVideoCall}
        videoCallActive={videoCallActive}
        videoCallParticipants={videoCallParticipants}
      />

      {/* Video Call Active Banner */}
      <AnimatePresence>
        {videoCallActive && !showVideoModal && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-green-500 text-white px-4 py-2 flex items-center justify-between"
          >
            <span className="text-sm">
              📹 Video call in progress • {videoCallParticipants.length} participant(s)
            </span>
            <button
              onClick={() => setShowVideoModal(true)}
              className="text-sm font-medium hover:underline"
            >
              Join Call
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      {room.type === 'live_event' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Broadcaster Video Panel (Theater Mode) */}
          <div className="flex-[3] relative bg-black flex flex-col">
            <div className="flex-1 min-h-0">
              <VideoGrid
                localStream={videoCall.localStream}
                remoteStreams={videoCall.remoteStreams}
                localUser={user}
                participants={videoCallParticipants}
                isAudioEnabled={videoCall.isAudioEnabled}
                isVideoEnabled={videoCall.isVideoEnabled}
                isSpectator={isSpectator}
                isLiveEvent={true}
              />
            </div>

            {/* Only show full controls for the Creator */}
            {isCreator && (
              <div className="h-20 shrink-0 border-t border-dark-800 bg-dark-950 flex items-center justify-center relative z-10">
                <VideoControls
                  isAudioEnabled={videoCall.isAudioEnabled}
                  isVideoEnabled={videoCall.isVideoEnabled}
                  onToggleAudio={videoCall.toggleAudio}
                  onToggleVideo={videoCall.toggleVideo}
                  onLeave={handleEnd}
                  participantCount={videoCallParticipants?.length || 0}
                />
              </div>
            )}
          </div>

          {/* Right Side Chat Sidebar */}
          <div className="w-[350px] shrink-0 border-l border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-900 flex flex-col">
            <Chat roomId={roomId} />
          </div>
        </div>
      ) : (
        <>
          {/* Standard Room Chat Area */}
          <div className="flex-1 overflow-hidden">
            <Chat roomId={roomId} />
          </div>

          {/* Standard Room Video Call Modal */}
          <VideoCallModal
            isOpen={showVideoModal}
            onClose={() => setShowVideoModal(false)}
            roomId={roomId}
            videoCall={videoCall}
          />
        </>
      )}
    </div>
  );
};

export default RoomView;