import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import RoomHeader from './RoomHeader';
import Chat from './Chat';
import SharedEditorPanel from './SharedEditorPanel';
import VideoCallModal from '../VideoCall/VideoCallModal';
import VideoGrid from '../VideoCall/VideoGrid';
import VideoControls from '../VideoCall/VideoControls';
import TicketReviewModal from '../Tickets/TicketReviewModal';
import { PageLoader } from '../common/Loader';
import EmptyState from '../common/EmptyState';
import Button from '../common/Button';
import toast from 'react-hot-toast';
import {
  getRoom,
  joinRoom,
  leaveRoom,
  endRoom,
  getRoomMessages,
  clearCurrentRoom
} from '../../redux/Slices/roomSlice';
import { resolveTicket as resolveHelpTicket } from '../../redux/Slices/ticketSlice';
import { resolveIssue as resolvePostedIssue } from '../../redux/Slices/issueSlice';
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
  const [reviewTicketId, setReviewTicketId] = useState(null);
  const [now, setNow] = useState(() => Date.now());

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

      if (room.type === 'vod_session') {
        if (!videoCallActive) {
          videoCall.startCall();
        } else {
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

  useEffect(() => {
    if (room?.type !== 'vod_session') return undefined;

    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [room?.type]);

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
  const isVodSession = room?.type === 'vod_session';
  const isIssueSession = room?.type === 'issue_session';

  const handleResolveTicket = async () => {
    const ticketId = room?.ticket?._id || room?.ticket;
    if (!ticketId) return;
    if (!window.confirm('Mark this help session as resolved?')) return;

    try {
      await dispatch(resolveHelpTicket(ticketId)).unwrap();
      videoCall.leaveCall();
      toast.success('Ticket resolved');
      setReviewTicketId(ticketId);
    } catch (error) {
      toast.error(error || 'Failed to resolve ticket');
    }
  };

  const handleResolveIssue = async () => {
    const issueId = room?.issue?._id || room?.issue;
    if (!issueId) return;
    if (!window.confirm('Mark this issue as fixed?')) return;

    try {
      const result = await dispatch(resolvePostedIssue(issueId)).unwrap();
      if (result?.payment?.url) {
        toast.success('Redirecting to Stripe to pay the bounty');
        window.location.href = result.payment.url;
        return;
      }
      toast.success('Issue resolved');
      navigate('/activity');
    } catch (error) {
      toast.error(error || 'Failed to resolve issue');
    }
  };

  const ticket = room?.ticket;
  const sessionStartedAt = ticket?.sessionStartedAt ? new Date(ticket.sessionStartedAt).getTime() : null;
  const minimumMs = (ticket?.estimatedMinutes || 30) * 60 * 1000;
  const elapsedMs = sessionStartedAt ? Math.max(0, now - sessionStartedAt) : 0;
  const remainingMs = Math.max(0, minimumMs - elapsedMs);
  const remainingMinutes = Math.floor(remainingMs / 60000);
  const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
  const minimumMet = sessionStartedAt && remainingMs === 0;

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
  if ((roomEnded || room?.status === 'ended') && !reviewTicketId) {
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
    <div className="flex flex-col h-screen bg-transparent">
      {/* Header */}
      <RoomHeader
        room={room}
        isCreator={isCreator}
        onLeave={handleLeave}
        onEnd={handleEnd}
        onResolveTicket={handleResolveTicket}
        onResolveIssue={handleResolveIssue}
        showResolveTicket={isVodSession && isCreator && !!room.ticket}
        showResolveIssue={isIssueSession && isCreator && room.issue?.status === 'in_progress'}
        onStartVideoCall={handleStartVideoCall}
        videoCallActive={videoCallActive}
        videoCallParticipants={videoCallParticipants}
      />

      <TicketReviewModal
        isOpen={!!reviewTicketId}
        ticketId={reviewTicketId}
        onClose={() => {
          setReviewTicketId(null);
          navigate('/');
        }}
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

      {isVodSession && (
        <div className="bg-gray-950 text-white px-4 py-2 flex items-center justify-center text-sm border-b border-dark-800">
          {sessionStartedAt
            ? minimumMet
              ? 'Minimum session time met. Payout is eligible when resolved.'
              : `Minimum time remaining: ${remainingMinutes}:${String(remainingSeconds).padStart(2, '0')}`
            : 'Minimum timer starts when both users join the video call.'}
        </div>
      )}

      {/* Main Content Area */}
      {room.type === 'live_event' || isVodSession ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Video Panel */}
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
                isLiveEvent={room.type === 'live_event'}
              />
            </div>

            {(isCreator || isVodSession) && (
              <div className="h-20 shrink-0 border-t border-dark-800/50 glass-dark flex items-center justify-center relative z-10">
                <VideoControls
                  isAudioEnabled={videoCall.isAudioEnabled}
                  isVideoEnabled={videoCall.isVideoEnabled}
                  isScreenSharing={videoCall.isScreenSharing}
                  onToggleAudio={videoCall.toggleAudio}
                  onToggleVideo={videoCall.toggleVideo}
                  onToggleScreenShare={!isSpectator ? videoCall.toggleScreenShare : undefined}
                  onLeave={isVodSession ? videoCall.leaveCall : handleEnd}
                  participantCount={videoCallParticipants?.length || 0}
                />
              </div>
            )}
          </div>

          {/* Right Side Chat Sidebar */}
          <div className="w-[350px] shrink-0 border-l border-dark-800/50 glass-dark flex flex-col">
            <Chat roomId={roomId} />
          </div>
        </div>
      ) : (
        <>
          {/* Standard and issue-session workspace */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="flex h-full flex-col lg:flex-row">
              <div className="min-h-[320px] flex-1 min-w-0">
                <SharedEditorPanel roomId={roomId} room={room} />
              </div>
              <div className="min-h-[320px] w-full shrink-0 border-l border-dark-800/50 glass-dark lg:w-[380px]">
                <Chat roomId={roomId} />
              </div>
            </div>
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
