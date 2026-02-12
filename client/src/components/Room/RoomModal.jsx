import { useNavigate } from 'react-router-dom';
import { Users, Video, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { formatRelativeTime, getCategoryEmoji } from '../../utils/helpers';
import { CATEGORY_COLORS } from '../../utils/constants';

const RoomModal = ({ isOpen = false, onClose = () => {}, room = null }) => {
  const navigate = useNavigate();

  // Return null if not open or no room
  if (!isOpen || !room) {
    return null;
  }

  const {
    _id = '',
    title = '',
    description = '',
    category = 'other',
    creator = {},
    participants = [],
    isVideoEnabled = false,
    createdAt = null,
    status = 'active',
  } = room;

  const handleJoin = () => {
    if (_id) {
      navigate(`/room/${_id}`);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && room && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-dark-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-dark-700">
              <div className="flex items-center gap-3">
                <Avatar
                  src={creator?.avatar}
                  name={creator?.displayName || 'User'}
                  size="md"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {creator?.displayName || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    @{creator?.username || 'unknown'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-3">
                {status === 'active' && (
                  <Badge variant="danger" dot>
                    LIVE
                  </Badge>
                )}
                <span className={`badge ${CATEGORY_COLORS[category] || CATEGORY_COLORS.other}`}>
                  {getCategoryEmoji(category)} {category}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {title}
              </h2>

              {/* Description */}
              {description && (
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {description}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <Users size={16} />
                  {participants?.length || 0} joined
                </span>
                {isVideoEnabled && (
                  <span className="flex items-center gap-1 text-green-500">
                    <Video size={16} />
                    Video enabled
                  </span>
                )}
                {createdAt && (
                  <span className="flex items-center gap-1">
                    <Clock size={16} />
                    {formatRelativeTime(createdAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-dark-700">
              <Button fullWidth onClick={handleJoin}>
                Join Room
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RoomModal;