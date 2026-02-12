import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Video, X, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { removeVideoCallInvite } from '../../redux/Slices/notificationSlice';
import Avatar from '../common/Avatar';

const VideoCallNotification = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { videoCallInvites } = useSelector((state) => state.notifications);

  const handleJoin = (invite) => {
    dispatch(removeVideoCallInvite(invite.roomId));
    navigate(`/room/${invite.roomId}?joinVideo=true`);
  };

  const handleDismiss = (roomId) => {
    dispatch(removeVideoCallInvite(roomId));
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3">
      <AnimatePresence>
        {videoCallInvites.map((invite) => (
          <motion.div
            key={invite.roomId}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-700 p-4 w-80 video-call-pulse"
          >
            <div className="flex items-start gap-3">
              <div className="relative">
                <Avatar
                  src={invite.user?.avatar}
                  name={invite.user?.displayName}
                  size="lg"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Video size={12} className="text-white" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">
                  Video Call Started
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {invite.user?.displayName} started a video call in "{invite.roomTitle}"
                </p>
              </div>

              <button
                onClick={() => handleDismiss(invite.roomId)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full transition-colors"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleDismiss(invite.roomId)}
                className="flex-1 py-2 px-4 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleJoin(invite)}
                className="flex-1 py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Phone size={16} />
                Join
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default VideoCallNotification;

//no changes made