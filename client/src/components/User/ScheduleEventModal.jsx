import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { CalendarDays, Tags, FileText, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { roomAPI } from '../../services/api';

const CATEGORIES = [
    'singing', 'travel', 'gaming', 'study', 'coding', 'music', 'art', 'fitness', 'cooking', 'other'
];

const ScheduleEventModal = ({ isOpen, onClose }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'other',
        scheduledStartTime: '',
        entryFee: 50 // Default ₹50
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim() || !formData.scheduledStartTime || formData.entryFee === '') {
            return toast.error('Please fill all required fields');
        }

        const selectedTime = new Date(formData.scheduledStartTime);
        if (selectedTime <= new Date()) {
            return toast.error('Scheduled time must be in the future');
        }

        try {
            setIsLoading(true);
            await roomAPI.schedule(formData);

            toast.success('Live Event Scheduled & Followers Notified!');
            setFormData({
                title: '',
                description: '',
                category: 'other',
                scheduledStartTime: '',
                entryFee: 50
            });
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to schedule event');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Schedule Live Event">
            <form onSubmit={handleSubmit} className="p-6 space-y-5">

                {/* Title */}
                <Input
                    label="Event Title *"
                    placeholder="e.g., Live Q&A Session! 🚀"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    maxLength={100}
                    required
                />

                {/* Date & Time */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                        Start Date & Time *
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <CalendarDays size={18} />
                        </div>
                        <input
                            type="datetime-local"
                            className="w-full bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-700 rounded-xl px-4 py-2.5 pl-11 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            value={formData.scheduledStartTime}
                            onChange={(e) => setFormData({ ...formData, scheduledStartTime: e.target.value })}
                            required
                        />
                    </div>
                </div>

                {/* Ticket Price */}
                <Input
                    type="number"
                    label="Ticket Price (₹) *"
                    placeholder="50"
                    value={formData.entryFee}
                    onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                    min="1"
                    leftIcon={<IndianRupee size={18} />}
                    required
                />

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                        Category *
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <Tags size={18} />
                        </div>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-700 rounded-xl px-4 py-2.5 pl-11 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all appearance-none capitalize"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
                        Schedule Event
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default ScheduleEventModal;
