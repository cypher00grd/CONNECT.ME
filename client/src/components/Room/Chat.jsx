import { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Code2, ImagePlus, Send, Smile, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import MessageItem from './MessageItem';
import Reactions from './Reactions';
import EmojiPicker from 'emoji-picker-react';
import useSocket from '../../hooks/useSocket';
import { debounce } from '../../utils/helpers';
import { authAPI } from '../../services/api';

const Chat = ({ roomId }) => {
  const { messages, typingUsers } = useSelector((state) => state.rooms);
  const { sendMessage, startTyping, stopTyping } = useSocket(roomId, { listen: false });

  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCodeComposer, setShowCodeComposer] = useState(false);
  const [codeTitle, setCodeTitle] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [codeDraft, setCodeDraft] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Debounced typing indicator
  const debouncedStopTyping = useCallback(
    debounce(() => {
      stopTyping();
    }, 1000),
    [stopTyping]
  );

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    startTyping();
    debouncedStopTyping();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (message.trim() || attachments.length > 0) {
      sendMessage(message.trim(), attachments);
      setMessage('');
      setAttachments([]);
      stopTyping();
      inputRef.current?.focus();
    }
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, 5 - attachments.length);
    if (files.length === 0) return;

    try {
      setIsUploading(true);
      const uploaded = [];
      for (const file of files) {
        const data = new FormData();
        data.append('image', file);
        const response = await authAPI.uploadImage(data);
        if (response.data?.url) {
          uploaded.push({
            url: response.data.url,
            type: 'image',
            name: file.name,
            size: file.size,
          });
        }
      }
      setAttachments((current) => [...current, ...uploaded].slice(0, 5));
      if (uploaded.length > 0) {
        toast.success(`${uploaded.length} image${uploaded.length > 1 ? 's' : ''} attached`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const removeAttachment = (url) => {
    setAttachments((current) => current.filter((attachment) => attachment.url !== url));
  };

  const handleSendCodeSnippet = () => {
    if (!codeDraft.trim()) return;

    const title = codeTitle.trim() ? `${codeTitle.trim()}\n` : '';
    sendMessage(`${title}\`\`\`${codeLanguage}\n${codeDraft.trim()}\n\`\`\``);
    setCodeTitle('');
    setCodeLanguage('javascript');
    setCodeDraft('');
    setShowCodeComposer(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Group messages by sender for avatar display
  const shouldShowAvatar = (index) => {
    if (index === 0) return true;
    const currentMessage = messages[index];
    const previousMessage = messages[index - 1];
    return currentMessage.sender?._id !== previousMessage.sender?._id;
  };

  const onEmojiClick = (emojiObject) => {
    setMessage((prevMsg) => prevMsg + emojiObject.emoji);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p className="text-lg mb-2">No messages yet</p>
            <p className="text-sm">Be the first to say something!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <MessageItem
              key={msg._id || index}
              message={msg}
              showAvatar={shouldShowAvatar(index)}
            />
          ))
        )}

        {/* Typing Indicator */}
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
            >
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing...`
                  : `${typingUsers.length} people are typing...`
                }
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Reactions Popup */}
      <AnimatePresence>
        {showReactions && (
          <Reactions
            roomId={roomId}
            onClose={() => setShowReactions(false)}
          />
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-4 border-t border-dark-800/50 relative">
        {/* Emoji Picker Popup */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-20 left-4 z-50 shadow-2xl"
            >
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                theme="dark"
                lazyLoadEmojis={true}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {attachments.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {attachments.length}/5 attached. Click an image to preview.
            </p>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {attachments.map((attachment) => (
              <div key={attachment.url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-dark-700 shrink-0 bg-gray-50 dark:bg-dark-900">
                <a href={attachment.url} target="_blank" rel="noreferrer" className="block w-full h-full">
                  <img src={attachment.url} alt={attachment.name || 'Attachment'} className="w-full h-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 px-1.5 py-1 bg-black/65 text-[10px] text-white truncate">
                    Preview
                  </span>
                </a>
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.url)}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white"
                  aria-label="Remove attachment"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {showCodeComposer && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-3 rounded-xl border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900 p-3"
            >
              <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px]">
                <input
                  value={codeTitle}
                  onChange={(event) => setCodeTitle(event.target.value)}
                  placeholder="Snippet title"
                  className="input-field"
                  maxLength={80}
                />
                <select
                  value={codeLanguage}
                  onChange={(event) => setCodeLanguage(event.target.value)}
                  className="input-field"
                >
                  {['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'html', 'css', 'sql', 'text'].map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={codeDraft}
                onChange={(event) => setCodeDraft(event.target.value)}
                placeholder="// Paste code, logs, or stack traces..."
                rows={5}
                className="input-field resize-none font-mono text-sm"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCodeComposer(false)}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendCodeSnippet}
                  disabled={!codeDraft.trim()}
                  className="rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  Share Code
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full transition-colors"
          >
            <Smile size={22} />
          </button>

          <label className={`p-2 rounded-full transition-colors ${
            isUploading || attachments.length >= 5
              ? 'text-gray-300 dark:text-dark-500 cursor-not-allowed'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 cursor-pointer'
          }`}>
            <ImagePlus size={22} />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleImageUpload}
              disabled={isUploading || attachments.length >= 5}
            />
          </label>

          <button
            type="button"
            onClick={() => setShowCodeComposer((prev) => !prev)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full transition-colors"
            aria-label="Share code snippet"
          >
            <Code2 size={22} />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="input-field !rounded-full py-2.5 px-5"
          />

          <motion.button
            type="submit"
            disabled={!message.trim() && attachments.length === 0}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              p-2.5 rounded-full transition-all duration-300 border-none
              ${message.trim() || attachments.length > 0
                ? 'bg-gradient-primary shadow-glow hover:shadow-[0_0_20px_rgba(255,77,77,0.5)] text-white'
                : 'bg-gray-200 dark:bg-dark-800 text-gray-500 dark:text-dark-400 cursor-not-allowed'
              }
            `}
          >
            <Send size={20} />
          </motion.button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
