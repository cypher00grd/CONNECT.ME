import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const VideoControls = ({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeave,
  participantCount,
}) => {
  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-dark-900/90 backdrop-blur-lg">
      
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
            ? 'bg-dark-700 hover:bg-dark-600 text-white'
            : 'bg-red-500 hover:bg-red-600 text-white'
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
            ? 'bg-dark-700 hover:bg-dark-600 text-white'
            : 'bg-red-500 hover:bg-red-600 text-white'
          }
        `}
      >
        {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
      </motion.button>

      {/* Leave Call */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onLeave}
        className="w-14 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
      >
        <PhoneOff size={22} />
      </motion.button>

    </div>
  );
};

export default VideoControls;
