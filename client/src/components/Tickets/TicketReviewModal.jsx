import { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { Star } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { reviewTicket } from '../../redux/Slices/ticketSlice';

const TicketReviewModal = ({ isOpen, onClose, ticketId }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    stars: 5,
    issueFixed: true,
    conceptUnderstood: true,
    comment: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await dispatch(reviewTicket({ ticketId, review: form })).unwrap();
      toast.success('Review submitted');
      onClose();
    } catch (error) {
      toast.error(error || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rate this session" size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Rating
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setForm({ ...form, stars: star })}
                className={star <= form.stars ? 'text-yellow-500' : 'text-gray-300'}
                aria-label={`${star} star rating`}
              >
                <Star size={28} fill="currentColor" />
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            checked={form.issueFixed}
            onChange={(event) => setForm({ ...form, issueFixed: event.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
          />
          Issue fixed or problem solved
        </label>

        <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            checked={form.conceptUnderstood}
            onChange={(event) => setForm({ ...form, conceptUnderstood: event.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
          />
          Concept understood clearly
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
            Comment
          </label>
          <textarea
            value={form.comment}
            onChange={(event) => setForm({ ...form, comment: event.target.value })}
            rows={3}
            maxLength={500}
            className="input-field resize-none"
            placeholder="What went well?"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Skip
          </Button>
          <Button type="submit" fullWidth isLoading={isSubmitting}>
            Submit
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TicketReviewModal;
