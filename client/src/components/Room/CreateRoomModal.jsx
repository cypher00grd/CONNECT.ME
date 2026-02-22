import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Video, Clock, Users, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { createRoom } from '../../redux/Slices/roomSlice';
import { CATEGORIES, AUTO_DELETE_OPTIONS } from '../../utils/constants';

const CreateRoomModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading } = useSelector((state) => state.rooms);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    isVideoEnabled: false,
    autoDeleteMinutes: null,
    maxParticipants: 10,
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Room title is required');
      return;
    }

    try {
      const result = await dispatch(createRoom(formData)).unwrap();
      onClose();
      navigate(`/room/${result._id}`);

      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'other',
        isVideoEnabled: false,
        autoDeleteMinutes: null,
        maxParticipants: 10,
      });
    } catch (err) {
      setError(err || 'Failed to create room');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create a Room" size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Title */}
        <Input
          label="What's happening?"
          name="title"
          placeholder="e.g., Guys I'm singing! 🎤"
          value={formData.title}
          onChange={handleChange}
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
            Description (optional)
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Tell more about this room..."
            rows={3}
            className="input-field resize-none"
            maxLength={500}
          />
          <p className="mt-1 text-xs text-gray-400 text-right">
            {formData.description.length}/500
          </p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
            Category
          </label>
          <div className="grid grid-cols-5 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, category: cat.value }))}
                className={`
                  flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all
                  ${formData.category === cat.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-dark-600 hover:border-gray-300 dark:hover:border-dark-500'
                  }
                `}
              >
                <span className="text-2xl mb-1">{cat.emoji}</span>
                <span className="text-xs text-gray-600 dark:text-gray-300">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Auto Delete */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              <Clock size={16} className="inline mr-1" />
              Auto-delete after
            </label>
            <select
              name="autoDeleteMinutes"
              value={formData.autoDeleteMinutes || ''}
              onChange={(e) => setFormData((prev) => ({
                ...prev,
                autoDeleteMinutes: e.target.value ? Number(e.target.value) : null,
              }))}
              className="input-field"
            >
              {AUTO_DELETE_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value || ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Max Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              <Users size={16} className="inline mr-1" />
              Max participants
            </label>
            <select
              name="maxParticipants"
              value={formData.maxParticipants}
              onChange={handleChange}
              className="input-field"
            >
              {[5, 10, 15, 20, 30, 50].map((num) => (
                <option key={num} value={num}>{num} people</option>
              ))}
            </select>
          </div>
        </div>

        {/* Video Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${formData.isVideoEnabled
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                : 'bg-gray-200 dark:bg-dark-600 text-gray-500'
              }
            `}>
              <Video size={20} />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Enable Video Call
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Allow participants to join video
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="isVideoEnabled"
              checked={formData.isVideoEnabled}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-dark-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-dark-600 peer-checked:bg-primary-500"></div>
          </label>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            fullWidth
            isLoading={isLoading}
          >
            Create Room
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateRoomModal;