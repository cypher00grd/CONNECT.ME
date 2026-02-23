import { Link } from 'react-router-dom';
import { UserPlus, Radio, Video, Megaphone } from 'lucide-react';
import Avatar from '../common/Avatar';
import { formatRelativeTime } from '../../utils/helpers';

const icons = {
  follow: UserPlus,
  room_created: Radio,
  video_call: Video,
  announcement: Megaphone,
};

const NotificationItem = ({ notification, onClick }) => {
  const { type, sender, room, isRead, createdAt } = notification;
  const Icon = icons[type] || Radio;

  const getLink = () => {
    if (type === 'room_created' && room?._id) return `/room/${room._id}`;
    if ((type === 'follow' || type === 'announcement') && sender?.username) return `/profile/${sender.username}`;
    return '#';
  };

  return (
    <Link
      to={getLink()}
      onClick={onClick}
      className={`
        flex items-start gap-3 p-4 transition-colors 
        hover:bg-gray-50 dark:hover:bg-dark-700 
        ${!isRead ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}
      `}
    >
      {/* Avatar + Icon */}
      <div className="relative">
        <Avatar
          src={sender?.avatar}
          name={sender?.displayName}
          size="md"
        />
        <div
          className={`
            absolute -bottom-1 -right-1 w-6 h-6 
            rounded-full flex items-center justify-center 
            ${(type === 'follow' || type === 'announcement') ? 'bg-primary-500' : 'bg-green-500'}
          `}
        >
          <Icon size={12} className="text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white">
          <span className="font-medium">{sender?.displayName}</span>{' '}
          {type === 'follow' && 'started following you'}
          {type === 'room_created' && room?.title && `started a room: "${room.title}"`}
          {type === 'video_call' && 'invited you to a video call'}
          {type === 'announcement' && notification.message && ` says: "${notification.message}"`}
        </p>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formatRelativeTime(createdAt)}
        </p>
      </div>

      {/* Unread dot */}
      {!isRead && <div className="w-2 h-2 bg-primary-500 rounded-full mt-2" />}
    </Link>
  );
};

export default NotificationItem;
