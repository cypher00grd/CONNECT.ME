import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSocket from '../../hooks/useSocket';
import { REACTIONS } from '../../utils/constants';

const Reactions = ({ roomId, onClose }) => {
  const { sendReaction } = useSocket(roomId);
  const [floatingReactions, setFloatingReactions] = useState([]);

  const handleReaction = (emoji) => {
    sendReaction(emoji);
    addFloatingReaction(emoji);
  };

  const addFloatingReaction = (emoji) => {
    const id = Date.now() + Math.random(); // safer unique id
    const left = Math.random() * 80 + 10; // range 10%-90%

    setFloatingReactions((prev) => [...prev, { id, emoji, left }]);

    // Remove after animation
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  // handle reactions from others (socket)
  useEffect(() => {
    // This is handled globally in useSocket via dispatch
    // Component only displays floating UI
  }, []);

  return (
    <>
      {/* Floating reaction animations */}
      <div className="fixed inset-0 pointer-events-none z-[999] overflow-hidden">
        <AnimatePresence>
          {floatingReactions.map((reaction) => (
            <motion.div
              key={reaction.id}
              initial={{
                bottom: 80,
                left: `${reaction.left}%`,
                opacity: 1,
                scale: 1,
              }}
              animate={{
                bottom: '100%',
                opacity: 0,
                scale: 1.6,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              className="absolute text-4xl"
            >
              {reaction.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reaction Picker */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        className="absolute bottom-full left-4 mb-2 z-[999]"
      >
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-2">
          <div className="flex gap-1">
            {REACTIONS.map((emoji) => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleReaction(emoji)}
                className="w-10 h-10 flex items-center justify-center text-2xl 
                  hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full transition-colors"
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Reactions;
