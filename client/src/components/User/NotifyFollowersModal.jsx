import { useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { userAPI } from '../../services/api';
import toast from 'react-hot-toast';

const NotifyFollowersModal = ({ isOpen, onClose, followersCount }) => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');

    const handleSend = async (e) => {
        e.preventDefault();
        if (!message.trim()) {
            setError('Message cannot be empty');
            return;
        }

        try {
            setIsSending(true);
            setError('');

            await userAPI.notifyFollowers({ message: message.trim() });

            toast.success('Announcement sent to followers!');
            setMessage('');
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send announcement');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Notify Followers" size="md">
            <form onSubmit={handleSend} className="p-6 space-y-4">
                {/* Header Icon & Context */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                        <Megaphone size={20} />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                            Broadcast Message
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Reaching {followersCount} {followersCount === 1 ? 'follower' : 'followers'}
                        </p>
                    </div>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm"
                    >
                        {error}
                    </motion.div>
                )}

                {/* Textarea */}
                <div>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your announcement here (e.g., 'Going live in 5 mins!')"
                        rows={4}
                        className="input-field resize-none"
                        maxLength={280}
                        disabled={isSending}
                    />
                    <div className="flex justify-between mt-1">
                        <p className="text-xs text-gray-500">
                            Followers will receive this in their notifications tab.
                        </p>
                        <p className={`text-xs ${message.length >= 280 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                            {message.length}/280
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-dark-700">
                    <Button
                        type="button"
                        variant="secondary"
                        fullWidth
                        onClick={onClose}
                        disabled={isSending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        fullWidth
                        isLoading={isSending}
                        disabled={followersCount === 0 || !message.trim()}
                    >
                        Send Notification
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default NotifyFollowersModal;
