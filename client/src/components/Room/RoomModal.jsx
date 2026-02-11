import { Link } from 'react-router-dom';
import { Users, Video, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

import Avatar from '../common/Avatar';
import Badge from '../common/Badge';

import {
  formatRelativeTime,
  getCategoryEmoji,
  getTimeRemaining,
} from '../../utils/helpers';

import { CATEGORY_COLORS } from '../../utils/constants';

const RoomModal = ({ room, index = 0 }) => {
  const {
    _id,
    title,
    description,
    category,
    creator,
    participants = [],
    isVideoEnabled,
    createdAt,
    autoDeleteAt,
    status,
  } = room;

  const isLive = status === 'active';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link to={`/room/${_id}`}>
        <div className="card card-hover p-5 group">

          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar
                src={creator?.avatar}
                name={creator?.displayName}
                size="md"
                showOnlineIndicator
                isOnline={isLive}
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {creator?.displayName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  @{creator?.username}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isLive && (
                <Badge variant="danger" dot>
                  LIVE
                </Badge>
              )}
              <span
                className={`badge ${
                  CATEGORY_COLORS[category] || CATEGORY_COLORS.other
                }`}
              >
                {getCategoryEmoji(category)} {category}
              </span>
            </div>
          </div>

          {/* Title + Description */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary-500 transition-colors">
            {title}
          </h3>

          {description && (
            <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-4">
              {description}
            </p>
          )}

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <Users size={16} />
              {participants.length} joined
            </span>

            {isVideoEnabled && (
              <span className="flex items-center gap-1.5 text-green-500">
                <Video size={16} />
                Video
              </span>
            )}

            <span className="flex items-center gap-1.5">
              <Clock size={16} />
              {formatRelativeTime(createdAt)}
            </span>

            {autoDeleteAt && (
              <span className="flex items-center gap-1.5 text-orange-500">
                <Clock size={16} />
                {getTimeRemaining(autoDeleteAt)}
              </span>
            )}
          </div>

          {/* Participants */}
          {participants.length > 0 && (
            <div className="flex items-center mt-4 pt-4 border-t border-gray-100 dark:border-dark-700">
              <div className="flex -space-x-2">
                {participants.slice(0, 5).map((p, i) => (
                  <Avatar
                    key={p?.user?._id || `${_id}-p-${i}`}
                    src={p?.user?.avatar}
                    name={p?.user?.displayName}
                    size="xs"
                    className="ring-2 ring-white dark:ring-dark-800"
                  />
                ))}
              </div>

              {participants.length > 5 && (
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  +{participants.length - 5} more
                </span>
              )}
            </div>
          )}

          {/* Join Button */}
          <motion.div
            className="mt-4 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            whileHover={{ height: 'auto', opacity: 1 }}
          >
            <button className="w-full py-2.5 btn-primary">Join Room</button>
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
};

export default RoomModal;
