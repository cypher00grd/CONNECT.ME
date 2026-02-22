import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import VideoGrid from './VideoGrid';
import VideoControls from './VideoControls';
import useAuth from '../../hooks/useAuth';

const VideoCallModal = ({ isOpen, onClose, roomId, videoCall }) => {
  const { user } = useAuth();

  const {
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    videoCallParticipants = [],
    joinCall,
    leaveCall,
    toggleAudio,
    toggleVideo,
  } = videoCall;

  // Join call when modal opens
  useEffect(() => {
    if (isOpen && !localStream) {
      joinCall();
    }
  }, [isOpen]);

  const handleClose = () => {
    leaveCall();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-dark-950"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-dark-900/90 to-transparent">
            <h2 className="text-white font-semibold">Video Call</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-dark-700 rounded-full text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Video Grid */}
          <div className="h-[calc(100%-80px)] pt-16">
            <VideoGrid
              localStream={localStream}
              remoteStreams={remoteStreams}
              localUser={user}
              participants={videoCallParticipants}
              isAudioEnabled={isAudioEnabled}
              isVideoEnabled={isVideoEnabled}
            />
          </div>

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0">
            <VideoControls
              isAudioEnabled={isAudioEnabled}
              isVideoEnabled={isVideoEnabled}
              onToggleAudio={toggleAudio}
              onToggleVideo={toggleVideo}
              onLeave={handleClose}
              participantCount={videoCallParticipants?.length || 0}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoCallModal;


//no chnges