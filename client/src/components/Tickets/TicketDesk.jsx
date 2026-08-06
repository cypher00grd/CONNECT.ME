import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { LifeBuoy, Plus, Sparkles } from 'lucide-react';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';
import TicketCard from './TicketCard';
import {
  approveHelper,
  cancelTicket,
  getMyTickets,
  getTicketFeed,
  lockTicket,
  rejectHelper,
  refreshTicketPayment,
  resolveTicket,
} from '../../redux/Slices/ticketSlice';

const getId = (value) => String(value?._id || value || '');

const activeStatuses = new Set(['payment_pending', 'searching', 'direct_pending', 'locked', 'accepted', 'in_progress']);

const TicketDesk = ({ onCreateTicket }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [view, setView] = useState('all');
  const { user } = useSelector((state) => state.auth);
  const {
    feedTickets,
    myTickets,
    actionTicketId,
  } = useSelector((state) => state.tickets);

  useEffect(() => {
    dispatch(getTicketFeed());
    dispatch(getMyTickets());
  }, [dispatch]);

  const activeMine = myTickets.filter((ticket) => activeStatuses.has(ticket.status));
  const matchingTickets = feedTickets.filter((ticket) => getId(ticket.requester) !== user?._id);
  const tabOptions = [
    { value: 'all', label: 'All' },
    { value: 'mine', label: `Mine ${activeMine.length}` },
    { value: 'matching', label: `Matching ${matchingTickets.length}` },
  ];

  const runAction = async (action, successMessage) => {
    try {
      const result = await dispatch(action).unwrap();
      if (successMessage) toast.success(successMessage);
      return result;
    } catch (error) {
      toast.error(error || 'Ticket action failed');
      return null;
    }
  };

  const handleLock = async (ticket) => {
    await runAction(lockTicket(ticket._id), 'Requester is reviewing your profile');
  };

  const handleApprove = async (ticket) => {
    const result = await runAction(approveHelper(ticket._id), 'Room is ready');
    const roomId = getId(result?.room);
    if (roomId) {
      navigate(`/room/${roomId}`);
    }
  };

  const handleReject = async (ticket) => {
    await runAction(rejectHelper(ticket._id), 'Searching for another helper');
  };

  const handleCancel = async (ticket) => {
    if (!window.confirm('Cancel this help ticket?')) return;
    await runAction(cancelTicket(ticket._id), 'Ticket cancelled');
  };

  const handleRefreshPayment = async (ticket) => {
    const result = await runAction(refreshTicketPayment(ticket._id));
    if (result?.payment?.url) {
      toast.success('Redirecting to secure payment');
      window.location.assign(result.payment.url);
      return;
    }

    if (result) {
      dispatch(getMyTickets());
      dispatch(getTicketFeed());
      toast.success('Payment synced');
    }
  };

  const handleResolve = async (ticket) => {
    if (!window.confirm('Mark this ticket as resolved?')) return;
    await runAction(resolveTicket(ticket._id), 'Ticket resolved');
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
            <LifeBuoy size={22} className="text-primary-500" />
            Developer Help Desk
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {user?.skills?.length ? `${user.skills.length} skills active` : 'No skills selected'}
          </p>
        </div>
        <Button onClick={onCreateTicket} leftIcon={<Plus size={18} />}>
          New Ticket
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabOptions.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setView(tab.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              view === tab.value
                ? 'bg-primary-500 text-white shadow-soft'
                : 'bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view !== 'matching' && activeMine.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <Sparkles size={16} className="text-primary-500" />
            Your active help requests
          </div>
          <div className="grid gap-3">
            {activeMine.slice(0, 3).map((ticket) => (
              <TicketCard
                key={ticket._id}
                ticket={ticket}
                currentUserId={user?._id}
                onApprove={handleApprove}
                onReject={handleReject}
                onCancel={handleCancel}
                onResolve={handleResolve}
                onRefreshPayment={handleRefreshPayment}
                isBusy={actionTicketId === ticket._id}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {view !== 'mine' && (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Matching developer requests
          </p>
          <Link
            to={`/profile/${user?.username}`}
            className="text-sm font-medium text-primary-500 hover:text-primary-600"
          >
            Edit skills
          </Link>
        </div>

        {matchingTickets.length > 0 ? (
          <div className="grid gap-3">
            {matchingTickets.slice(0, 5).map((ticket) => (
              <TicketCard
                key={ticket._id}
                ticket={ticket}
                currentUserId={user?._id}
                onLock={handleLock}
                isBusy={actionTicketId === ticket._id}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<LifeBuoy size={32} />}
            title="No matching tickets"
            description="Tickets that match your skills will appear here."
          />
        )}
      </div>
      )}
    </section>
  );
};

export default TicketDesk;
