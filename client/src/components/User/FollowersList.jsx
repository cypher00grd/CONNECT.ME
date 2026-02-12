import { motion } from 'framer-motion';
import Avatar from '../common/Avatar';
import FollowButton from './FollowButton';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const FollowersList = ({ users, type = 'followers', emptyMessage }) => {
  const { userId } = useAuth();

  if (!users || users.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {emptyMessage || `No ${type} yet`}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user, index) => (
        <motion.div
          key={user._id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
        >
          <Link
            to={`/profile/${user.username}`}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <Avatar
              src={user.avatar}
              name={user.displayName}
              size="md"
            />
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {user.displayName}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                @{user.username}
              </p>
            </div>
          </Link>

          {user._id !== userId && (
            <FollowButton
              userId={user._id}
              isFollowing={user.isFollowing}
              size="sm"
            />
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default FollowersList;


// no improve