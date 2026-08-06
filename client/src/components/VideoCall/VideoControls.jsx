import { Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, ScreenShareOff, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const VideoControls = ({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  isScreenSharing = false,
  onLeave,
  participantCount,
}) => {
  return (
    <div className="flex items-center justify-center gap-4">

      {/* Participant Count */}
      <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-dark-700 rounded-full text-white">
        <Users size={18} />
        <span className="text-sm">{participantCount}</span>
      </div>

      {/* Audio Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleAudio}
        className={`
          w-12 h-12 rounded-full flex items-center justify-center transition-colors
          ${isAudioEnabled
            ? 'glass-dark hover:bg-dark-800 border border-dark-700/50 text-white'
            : 'bg-dark-800/80 hover:bg-dark-700/80 text-red-500 border border-red-500/20'
          }
        `}
      >
        {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
      </motion.button>

      {/* Video Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleVideo}
        className={`
          w-12 h-12 rounded-full flex items-center justify-center transition-colors
          ${isVideoEnabled
            ? 'glass-dark hover:bg-dark-800 border border-dark-700/50 text-white'
            : 'bg-dark-800/80 hover:bg-dark-700/80 text-red-500 border border-red-500/20'
          }
        `}
      >
        {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
      </motion.button>

      {/* Screen Share Toggle */}
      {onToggleScreenShare && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleScreenShare}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center transition-colors
            ${isScreenSharing
              ? 'bg-primary-500 text-white shadow-glow'
              : 'glass-dark hover:bg-dark-800 border border-dark-700/50 text-white'
            }
          `}
          title={isScreenSharing ? 'Stop screen share' : 'Share screen'}
        >
          {isScreenSharing ? <ScreenShareOff size={20} /> : <ScreenShare size={20} />}
        </motion.button>
      )}

      {/* Leave Call */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onLeave}
        className="w-14 h-12 rounded-[24px] bg-gradient-primary shadow-glow hover:shadow-[0_0_20px_rgba(255,77,77,0.4)] text-white flex items-center justify-center transition-all duration-300 border-none"
      >
        <PhoneOff size={22} />
      </motion.button>

    </div>
  );
};

export default VideoControls;
