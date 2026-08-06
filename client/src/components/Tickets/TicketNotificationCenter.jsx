import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, LifeBuoy, Star, X } from 'lucide-react';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import {
  approveHelper,
  clearRoomToJoin,
  dismissIncomingPing,
  lockTicket,
  rejectHelper,
} from '../../redux/Slices/ticketSlice';

const getId = (value) => String(value?._id || value || '');

const TicketNotificationCenter = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    incomingPings,
    pendingReview,
    actionTicketId,
    roomToJoin,
  } = useSelector((state) => state.tickets);

  useEffect(() => {
    const roomId = getId(roomToJoin);
    if (!roomId) return;

    dispatch(clearRoomToJoin());
    navigate(`/room/${roomId}`);
  }, [dispatch, navigate, roomToJoin]);

  const handleLock = async (ticketId) => {
    try {
      await dispatch(lockTicket(ticketId)).unwrap();
      toast.success('Requester is reviewing your profile');
    } catch (error) {
      toast.error(error || 'Ticket is no longer available');
    }
  };

  const handleApprove = async (ticketId) => {
    try {
      const result = await dispatch(approveHelper(ticketId)).unwrap();
      toast.success('Room is ready');
      const roomId = getId(result?.room);
      if (roomId) {
        navigate(`/room/${roomId}`);
      }
    } catch (error) {
      toast.error(error || 'Failed to approve helper');
    }
  };

  const handleReject = async (ticketId) => {
    try {
      await dispatch(rejectHelper(ticketId)).unwrap();
      toast.success('Searching for another helper');
    } catch (error) {
      toast.error(error || 'Failed to pass helper');
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm space-y-3">
      <AnimatePresence>
        {pendingReview?.ticket && (
          <motion.div
            key={`review-${pendingReview.ticket._id}`}
            initial={{ opacity: 0, x: 80, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.96 }}
            className="bg-white dark:bg-dark-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-700 p-4"
          >
            <div className="flex items-start gap-3">
              <Avatar
                src={pendingReview.helper?.avatar}
                name={pendingReview.helper?.displayName}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">
                  Helper ready
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {pendingReview.helper?.displayName || 'Someone'} accepted "{pendingReview.ticket.title}"
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(pendingReview.helper?.skills || []).slice(0, 3).map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-300 text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-medium">
                    <Star size={12} />
                    {(pendingReview.helper?.rating ?? 5).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              {pendingReview.helper?.username && (
                <Link to={`/profile/${pendingReview.helper.username}`} className="flex-1">
                  <Button variant="secondary" fullWidth>
                    View Profile
                  </Button>
                </Link>
              )}
              <Button
                variant="secondary"
                fullWidth
                onClick={() => handleReject(pendingReview.ticket._id)}
                disabled={actionTicketId === pendingReview.ticket._id}
              >
                Pass
              </Button>
              <Button
                fullWidth
                leftIcon={<CheckCircle2 size={16} />}
                onClick={() => handleApprove(pendingReview.ticket._id)}
                isLoading={actionTicketId === pendingReview.ticket._id}
              >
                Approve
              </Button>
            </div>
          </motion.div>
        )}

        {incomingPings.map((ping) => {
          const ticket = ping.ticket;
          if (!ticket?._id) return null;

          return (
            <motion.div
              key={ticket._id}
              initial={{ opacity: 0, x: 80, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.96 }}
              className="bg-white dark:bg-dark-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-700 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-500 flex items-center justify-center shrink-0">
                  <LifeBuoy size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                    {ticket.title}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {ticket.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch(dismissIncomingPing(ticket._id))}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-400"
                  aria-label="Dismiss ticket"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {(ticket.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-300 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => dispatch(dismissIncomingPing(ticket._id))}
                >
                  Later
                </Button>
                <Button
                  fullWidth
                  leftIcon={<CheckCircle2 size={16} />}
                  onClick={() => handleLock(ticket._id)}
                  isLoading={actionTicketId === ticket._id}
                >
                  Accept
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default TicketNotificationCenter;
