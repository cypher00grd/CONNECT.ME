import { useState } from 'react';
import { CalendarDays, Tags, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { roomAPI } from '../../services/api';
import { CATEGORIES } from '../../utils/constants';

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
        if (Number.isNaN(selectedTime.getTime()) || selectedTime <= new Date()) {
            return toast.error('Scheduled time must be in the future');
        }

        const entryFee = Number(formData.entryFee);
        if (!Number.isInteger(entryFee) || entryFee < 1) {
            return toast.error('Ticket price must be a whole rupee amount of at least 1');
        }

        try {
            setIsLoading(true);
            await roomAPI.schedule({ ...formData, entryFee });

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
        <Modal isOpen={isOpen} onClose={onClose} title="Schedule Developer Event" size="lg">
            <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="p-5 sm:p-6 space-y-4">

                {/* Title */}
                <Input
                    label="Event Title *"
                    placeholder="e.g., Live React performance Q&A"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    maxLength={100}
                    required
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                        Description
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="input-field resize-none"
                        placeholder="What will people learn or discuss?"
                        maxLength={500}
                    />
                </div>

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
                            className="input-field !pl-11 dark:[color-scheme:dark]"
                            value={formData.scheduledStartTime}
                            onChange={(e) => setFormData({ ...formData, scheduledStartTime: e.target.value })}
                            min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
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
                    step="1"
                    leftIcon={<IndianRupee size={18} />}
                    required
                />

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                        Engineering area *
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <Tags size={18} />
                        </div>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="input-field !pl-11 appearance-none capitalize dark:bg-dark-900 dark:text-white"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value} className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">
                                    {cat.emoji} {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                </div>

                <div className="sticky bottom-0 flex gap-3 p-5 sm:p-6 border-t border-gray-100 dark:border-dark-700 bg-white dark:bg-dark-900">
                    <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
                        Schedule Developer Event
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default ScheduleEventModal;
