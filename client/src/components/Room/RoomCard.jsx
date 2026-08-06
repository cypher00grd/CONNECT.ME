import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Users, Video, Clock, PlayCircle, CalendarDays, GitBranch } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion as Motion } from 'framer-motion';
import { roomAPI } from '../../services/api';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import { formatRelativeTime, getCategoryEmoji, getCategoryLabel, getTimeRemaining } from '../../utils/helpers';
import { CATEGORY_COLORS, ROOM_DIFFICULTIES, ROOM_SESSION_TYPES } from '../../utils/constants';

const getOptionLabel = (options, value, fallback = '') => (
  options.find((option) => option.value === value)?.label || fallback || value
);

const getSessionEmoji = (value) => (
  ROOM_SESSION_TYPES.find((option) => option.value === value)?.emoji || '💬'
);

const formatScheduledTime = (date) => {
  if (!date) return '';

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const RoomCard = ({ room, index = 0 }) => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [now, setNow] = useState(() => Date.now());

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
    scheduledStartTime,
    sessionType,
    difficulty,
    techTags = [],
    repositoryUrl,
  } = room || {};

  const isCreator = user?._id === creator?._id;
  const isLive = status === 'active';
  const isScheduled = status === 'scheduled';
  const scheduledDate = scheduledStartTime ? new Date(scheduledStartTime) : null;
  const scheduledTimestamp = scheduledDate?.getTime();
  const hasScheduledTime = scheduledTimestamp && !Number.isNaN(scheduledTimestamp);
  const isStartable = isScheduled && isCreator && hasScheduledTime && scheduledTimestamp <= now;

  useEffect(() => {
    if (!isScheduled) return undefined;

    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [isScheduled, scheduledStartTime]);

  // Keep hooks stable even if an upstream feed briefly contains an empty item.
  if (!room) return null;

  const handleGoLive = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isStartable) {
      toast.error('This event can only be started at its scheduled time');
      return;
    }

    try {
      const res = await roomAPI.startEvent(_id);
      if (res.data?.success) {
        toast.success("We're Live!");
        navigate(`/room/${_id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start event');
    }
  };

  const card = (
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
          {isScheduled && (
            <Badge variant="warning" dot>
              Scheduled
            </Badge>
          )}
          <span className={`badge ${CATEGORY_COLORS[category] || CATEGORY_COLORS.other}`}>
            {getCategoryEmoji(category)} {getCategoryLabel(category)}
          </span>
        </div>
      </div>

      {/* Title & Description */}
      <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-500 transition-colors tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-4">
          {description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {sessionType && (
          <span className="badge bg-gray-100 dark:bg-dark-800 text-gray-700 dark:text-gray-300">
            {getSessionEmoji(sessionType)} {getOptionLabel(ROOM_SESSION_TYPES, sessionType, 'Open Discussion')}
          </span>
        )}
        {difficulty && difficulty !== 'any' && (
          <span className="badge bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            {getOptionLabel(ROOM_DIFFICULTIES, difficulty)}
          </span>
        )}
        {techTags.slice(0, 5).map((tag) => (
          <span
            key={tag}
            className="badge bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-300"
          >
            {tag}
          </span>
        ))}
        {repositoryUrl && (
          <span className="badge bg-gray-100 dark:bg-dark-800 text-gray-700 dark:text-gray-300">
            <GitBranch size={13} /> Repo
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
        {isScheduled ? (
          <span className="flex items-center gap-1.5 text-primary-500">
            <CalendarDays size={16} />
            {hasScheduledTime ? `Starts ${formatScheduledTime(scheduledDate)}` : 'Scheduled'}
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <Users size={16} />
            {participants.length} joined
          </span>
        )}

        {isVideoEnabled && (
          <span className="flex items-center gap-1.5 text-green-500">
            <Video size={16} />
            Video
          </span>
        )}

        <span className="flex items-center gap-1.5">
          <Clock size={16} />
          {isScheduled ? formatRelativeTime(createdAt) : formatRelativeTime(createdAt)}
        </span>

        {autoDeleteAt && !isScheduled && (
          <span className="flex items-center gap-1.5 text-orange-500">
            <Clock size={16} />
            {getTimeRemaining(autoDeleteAt)}
          </span>
        )}
      </div>

      {/* Participants */}
      {!isScheduled && participants.length > 0 && (
        <div className="flex items-center mt-4 pt-4 border-t border-gray-100 dark:border-dark-700">
          <div className="flex -space-x-2">
            {participants.slice(0, 5).map((p, i) => (
              <Avatar
                key={p.user?._id || i}
                src={p.user?.avatar}
                name={p.user?.displayName}
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

      {/* Action Button */}
      <div className="mt-4 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {isScheduled ? (
          isStartable ? (
            <button
              onClick={handleGoLive}
              className="w-full py-2.5 btn-primary bg-gradient-primary border-none flex items-center justify-center gap-2 shadow-sm dark:shadow-glow hover:shadow-md dark:hover:shadow-glow-lg"
            >
              <PlayCircle size={18} /> Start Live Event
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full py-2.5 btn-secondary border-primary-500 text-primary-500 cursor-not-allowed"
            >
              {isCreator ? 'Reminder' : 'Scheduled'}: {hasScheduledTime ? formatScheduledTime(scheduledDate) : 'waiting'}
            </button>
          )
        ) : (
          <div className="w-full py-2.5 btn-primary text-center">Join Room</div>
        )}
      </div>
    </div>
  );

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      {isScheduled ? card : <Link to={`/room/${_id}`}>{card}</Link>}
    </Motion.div>
  );
};

export default RoomCard;
