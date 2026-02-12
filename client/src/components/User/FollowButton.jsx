import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { UserPlus, UserMinus, Check } from 'lucide-react';
import { followUser, unfollowUser } from '../../redux/Slices/userSlice';
import { addToFollowing, removeFromFollowing } from '../../redux/Slices/authSlice';
import Button from '../common/Button';

const FollowButton = ({ userId, isFollowing: initialFollowing, size = 'md', showIcon = true }) => {
  const dispatch = useDispatch();

  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Sync prop updates → internal state (important for profile pages)
  useEffect(() => {
    setIsFollowing(initialFollowing);
  }, [initialFollowing]);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) return;

    setIsLoading(true);

    try {
      if (isFollowing) {
        await dispatch(unfollowUser(userId)).unwrap();
        dispatch(removeFromFollowing(userId));
        setIsFollowing(false);
      } else {
        await dispatch(followUser(userId)).unwrap();
        dispatch(addToFollowing(userId));
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Follow/Unfollow Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------
  //  Following State UI
  // -------------------------
  if (isFollowing) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isLoading}
        className={`
          flex items-center justify-center gap-2
          font-medium rounded-full transition-all duration-300
          ${size === 'sm' ? 'px-4 py-1.5 text-sm' : 'px-5 py-2'}
          border
          ${
            isHovered
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-300 dark:border-red-800'
              : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-dark-600'
          }
        `}
      >
        {showIcon && (isHovered ? <UserMinus size={16} /> : <Check size={16} />)}
        {isHovered ? 'Unfollow' : 'Following'}
      </motion.button>
    );
  }

  // -------------------------
  //  Not Following State
  // -------------------------
  return (
    <Button
      onClick={handleClick}
      isLoading={isLoading}
      size={size}
      leftIcon={showIcon && <UserPlus size={16} />}
      className="rounded-full"
    >
      Follow
    </Button>
  );
};

export default FollowButton;
