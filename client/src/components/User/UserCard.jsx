import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Avatar from '../common/Avatar';
import FollowButton from './FollowButton';
import { EXPERIENCE_LEVELS, SPECIALIZATIONS } from '../../utils/constants';

const getLabel = (items, value, fallback = 'Other') => (
  items.find((item) => item.value === value)?.label || fallback
);

const getTechPreview = (user = {}) => {
  const stack = user.techStack || {};
  return [
    ...(stack.languages || []),
    ...(stack.frameworks || []),
    ...(stack.tools || []),
  ].filter(Boolean).slice(0, 3);
};

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
    specialization,
    experienceLevel,
    yearsOfExperience,
  } = user;

  const totalFollowers = followersCount || followers?.length || 0;
  const techPreview = getTechPreview(user);

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

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                {getLabel(SPECIALIZATIONS, specialization)}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-300 text-xs font-medium">
                {getLabel(EXPERIENCE_LEVELS, experienceLevel, 'Mid-level')}
                {Number(yearsOfExperience) > 0 ? ` · ${yearsOfExperience} yrs` : ''}
              </span>
              {techPreview.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-300 text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>

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
