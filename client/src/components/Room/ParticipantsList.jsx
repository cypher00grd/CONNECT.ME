import { Crown, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { motion } from 'framer-motion';
import Avatar from '../common/Avatar';
import useAuth from '../../hooks/useAuth';

const ParticipantsList = ({ 
  participants, 
  creatorId, 
  videoCallParticipants = [],
  onClose 
}) => {
  const { userId } = useAuth();

  const isCreator = (participantId) => {
    return participantId === creatorId;
  };

  const isInVideoCall = (participantId) => {
    return videoCallParticipants.some((p) => p._id === participantId);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Participants ({participants?.length || 0})
        </h3>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {participants?.map((participant, index) => {
          const user = participant.user || participant;
          const participantId = user._id || user;
          const isMe = participantId === userId;
          const inVideo = isInVideoCall(participantId);

          return (
            <motion.div
              key={participantId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`
                flex items-center justify-between p-3 rounded-xl
                ${isMe ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-dark-700'}
                transition-colors
              `}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar
                    src={user.avatar}
                    name={user.displayName}
                    size="md"
                    showOnlineIndicator
                    isOnline={true}
                  />
                  {inVideo && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Video size={12} className="text-white" />
                    </div>
                  )}
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user.displayName}
                      {isMe && <span className="text-gray-400 ml-1">(You)</span>}
                    </p>
                    {isCreator(participantId) && (
                      <Crown size={14} className="text-yellow-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    @{user.username}
                  </p>
                </div>
              </div>

              {inVideo && (
                <div className="flex items-center gap-1">
                  <div className="p-1.5 bg-gray-100 dark:bg-dark-600 rounded-full">
                    <Mic size={14} className="text-green-500" />
                  </div>
                  <div className="p-1.5 bg-gray-100 dark:bg-dark-600 rounded-full">
                    <Video size={14} className="text-green-500" />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ParticipantsList;