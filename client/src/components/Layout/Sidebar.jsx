import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Home,
  Compass,
  User,
  Settings,
  Users,
  Radio
} from 'lucide-react';
import { motion } from 'framer-motion';
import useAuth from '../../hooks/useAuth';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import { getSuggestions, followUser } from '../../redux/Slices/userSlice';
import { addToFollowing } from '../../redux/Slices/authSlice';
import { useEffect, useCallback } from 'react';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: Radio, label: 'My Rooms', path: '/my-rooms' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { user, username } = useAuth();
  const { suggestions } = useSelector((state) => state.users);

  /** Fetch suggestions only once on mount */
  useEffect(() => {
    dispatch(getSuggestions());
  }, [dispatch]);

  /** Follow handler */
  const handleFollow = useCallback(
    async (userId) => {
      await dispatch(followUser(userId));
      dispatch(addToFollowing(userId));
    },
    [dispatch]
  );

  /** Close sidebar on link click (mobile) */
  const handleNavClick = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 left-0 bottom-0 w-72
          bg-white dark:bg-dark-900
          border-r border-gray-100 dark:border-dark-800
          transform transition-transform duration-300 ease-in-out
          z-40 lg:z-30
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto
        `}
      >
        <div className="p-4 space-y-6">

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={
                    item.path === '/profile'
                      ? `/profile/${username}`
                      : item.path
                  }
                  onClick={handleNavClick}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-xl
                    transition-all duration-200
                    ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-800'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-dark-700" />

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 px-4 mb-3">
                Suggested for you
              </h3>

              <div className="space-y-2">
                {suggestions.slice(0, 5).map((suggestedUser) => (
                  <div
                    key={suggestedUser._id}
                    className="flex items-center justify-between px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={suggestedUser.avatar}
                        name={suggestedUser.displayName}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {suggestedUser.displayName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          @{suggestedUser.username}
                        </p>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleFollow(suggestedUser._id)}
                      className="text-xs font-medium text-primary-500 hover:text-primary-600"
                    >
                      Follow
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="bg-gray-50 dark:bg-dark-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                src={user?.avatar}
                name={user?.displayName}
                size="lg"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {user?.displayName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  @{user?.username}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-around text-center">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {user?.followers?.length || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Followers
                </p>
              </div>

              <div className="w-px h-8 bg-gray-200 dark:bg-dark-600" />

              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {user?.following?.length || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Following
                </p>
              </div>
            </div>
          </div>

        </div>
      </aside>
    </>
  );
};

export default Sidebar;
