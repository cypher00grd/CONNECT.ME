import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import useTheme from '../../hooks/useTheme';

const ThemeToggle = ({ size = 'md', className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className={`
        ${sizes[size]}
        flex items-center justify-center
        rounded-full
        bg-gray-100 dark:bg-dark-700
        hover:bg-gray-200 dark:hover:bg-dark-600
        text-gray-600 dark:text-gray-300
        transition-colors duration-300
        ${className}
      `}
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {isDark ? (
          <Moon size={iconSizes[size]} />
        ) : (
          <Sun size={iconSizes[size]} />
        )}
      </motion.div>
    </motion.button>
  );
};

export default ThemeToggle;