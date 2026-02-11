import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, X, Info } from 'lucide-react';

const icons = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertCircle className="w-5 h-5 text-yellow-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
};

const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
  // Auto-close
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.25 }}
      className="
        flex items-center gap-3
        px-4 py-3
        bg-white dark:bg-dark-800
        rounded-xl shadow-lg
        border border-gray-100 dark:border-dark-700
        min-w-[300px]
      "
    >
      {/* Icon */}
      {icons[type]}

      {/* Message */}
      <p className="flex-1 text-sm text-gray-700 dark:text-gray-200">
        {message}
      </p>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="
          p-1 rounded-full
          hover:bg-gray-100 dark:hover:bg-dark-700
          transition-colors
        "
      >
        <X size={16} className="text-gray-400" />
      </button>
    </motion.div>
  );
};

// ==================
// Toast Container
// ==================
export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// ==================
// Toast Hook
// ==================
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random(); // safer unique ID
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    toasts,
    addToast,
    removeToast,
    success: (message, duration) => addToast(message, 'success', duration),
    error: (message, duration) => addToast(message, 'error', duration),
    warning: (message, duration) => addToast(message, 'warning', duration),
    info: (message, duration) => addToast(message, 'info', duration),
  };
};

export default Toast;
