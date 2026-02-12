import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Moon, 
  Sun, 
  Bell, 
  Lock, 
  User, 
  LogOut,
  ChevronRight,
  Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import { logout } from '../redux/Slices/authSlice';
import useTheme from '../hooks/useTheme';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import { useNavigate } from 'react-router-dom';

const SettingItem = ({ icon: Icon, title, description, action, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors rounded-xl"
  >
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-gray-100 dark:bg-dark-600 rounded-full flex items-center justify-center">
        <Icon size={20} className="text-gray-600 dark:text-gray-300" />
      </div>
      <div className="text-left">
        <p className="font-medium text-gray-900 dark:text-white">{title}</p>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
    </div>
    {action || <ChevronRight size={20} className="text-gray-400" />}
  </button>
);

const Settings = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { isDark, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
      </motion.div>

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <div className="flex items-center gap-4">
          <Avatar
            src={user?.avatar}
            name={user?.displayName}
            size="xl"
          />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {user?.displayName}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">@{user?.username}</p>
          </div>
        </div>
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card overflow-hidden"
      >
        <h3 className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-dark-700">
          Appearance
        </h3>
        <SettingItem
          icon={isDark ? Moon : Sun}
          title="Dark Mode"
          description={isDark ? 'Currently using dark theme' : 'Currently using light theme'}
          action={
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isDark}
                onChange={toggleTheme}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-dark-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-dark-600 peer-checked:bg-primary-500"></div>
            </label>
          }
        />
      </motion.div>

      {/* Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card overflow-hidden"
      >
        <h3 className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-dark-700">
          Notifications
        </h3>
        <SettingItem
          icon={Bell}
          title="Push Notifications"
          description="Get notified when someone you follow starts a room"
          action={
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications}
                onChange={() => setNotifications(!notifications)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-dark-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-dark-600 peer-checked:bg-primary-500"></div>
            </label>
          }
        />
      </motion.div>

      {/* Account */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card overflow-hidden"
      >
        <h3 className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-dark-700">
          Account
        </h3>
        <SettingItem
          icon={User}
          title="Edit Profile"
          onClick={() => navigate(`/profile/${user?.username}`)}
        />
        <SettingItem
          icon={Lock}
          title="Change Password"
        />
        <SettingItem
          icon={Shield}
          title="Privacy & Security"
        />
      </motion.div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          variant="danger"
          fullWidth
          leftIcon={<LogOut size={18} />}
          onClick={handleLogout}
        >
          Log Out
        </Button>
      </motion.div>
    </div>
  );
};

export default Settings;