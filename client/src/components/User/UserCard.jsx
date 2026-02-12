import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Avatar from '../common/Avatar';
import FollowButton from './FollowButton';

const UserCard = ({ user, showFollowButton = true, index = 0 }) => {
  if (!user) return null; // safety check

  const {
    _id,
    username,
    displayName,
    avatar,
    bio,
    isFollowing,
    followersCount,
    followers,
  } = user;

  const totalFollowers = followersCount || followers?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card card-hover p-4"
    >
      <div className="flex items-center justify-between">
        {/* Profile Navigation */}
        <Link
          to={`/profile/${username}`}
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <Avatar src={avatar} name={displayName} size="lg" />

          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white truncate">
              {displayName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              @{username}
            </p>

            {bio && (
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1 mt-1">
                {bio}
              </p>
            )}

            <p className="text-xs text-gray-400 mt-1">
              {totalFollowers} followers
            </p>
          </div>
        </Link>

        {/* Follow Button */}
        {showFollowButton && _id && (
          <FollowButton
            userId={_id}
            isFollowing={isFollowing}
            size="sm"
          />
        )}
      </div>
    </motion.div>
  );
};

export default UserCard;
