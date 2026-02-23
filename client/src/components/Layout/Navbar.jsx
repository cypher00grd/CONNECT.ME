import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Search,
  Bell,
  Plus,
  Menu,
  LogOut,
  User,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logout } from '../../redux/Slices/authSlice';
import useAuth from '../../hooks/useAuth';
import useTheme from '../../hooks/useTheme';
import Avatar from '../common/Avatar';
import ThemeToggle from '../common/ThemeToggle';
import NotificationDropdown from '../Notifications/NotificationDropdown';
import SearchUsers from '../User/SearchUsers';

const Navbar = ({ onMenuClick, onCreateRoom }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [showSearch, setShowSearch] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => !prev);
  }, []);

  const toggleProfileMenu = useCallback(() => {
    setShowProfileMenu((prev) => !prev);
  }, []);

  const closeProfileMenu = useCallback(() => {
    setShowProfileMenu(false);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-gray-200/50 dark:border-dark-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex items-center justify-between h-16">

          {/* Left Section */}
          <div className="flex items-center gap-4">

            {/* Mobile Menu Button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-xl transition-colors"
            >
              <Menu size={24} className="text-gray-600 dark:text-gray-300" />
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <span className="text-xl font-bold text-gradient hidden sm:block">
                Connect
              </span>
            </Link>
          </div>

          {/* Center Search (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <SearchUsers />
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Mobile Search Toggle */}
            <button
              onClick={toggleSearch}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-xl transition-colors"
            >
              <Search size={20} className="text-gray-600 dark:text-gray-300" />
            </button>

            {/* Create Room Button (Desktop) */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCreateRoom}
              className="hidden sm:flex items-center gap-2 px-4 py-2 btn-primary"
            >
              <Plus size={18} />
              <span>Create Room</span>
            </motion.button>

            {/* Mobile Create Button */}
            <button
              onClick={onCreateRoom}
              className="sm:hidden p-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors"
            >
              <Plus size={20} />
            </button>

            {/* Theme Toggle */}
            <ThemeToggle size="sm" />

            {/* Notifications */}
            <NotificationDropdown />

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={toggleProfileMenu}
                className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-xl transition-colors"
              >
                <Avatar
                  src={user?.avatar}
                  name={user?.displayName}
                  size="sm"
                />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <>
                    {/* Overlay Click Closes Menu */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={closeProfileMenu}
                    />

                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-gray-100 dark:border-dark-700 py-2 z-20"
                    >
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-700">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user?.displayName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          @{user?.username}
                        </p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          to={`/profile/${user?.username}`}
                          onClick={closeProfileMenu}
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                        >
                          <User size={18} />
                          Profile
                        </Link>

                        <Link
                          to="/settings"
                          onClick={closeProfileMenu}
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                        >
                          <Settings size={18} />
                          Settings
                        </Link>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-gray-100 dark:border-dark-700 pt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <LogOut size={18} />
                          Log out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden pb-4"
            >
              <SearchUsers onSelect={toggleSearch} />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </nav>
  );
};

export default Navbar;
