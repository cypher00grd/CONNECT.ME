import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Radio, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { getFeedRooms } from '../redux/Slices/roomSlice';
import RoomCard from '../components/Room/RoomCard.jsx';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import TicketDesk from '../components/Tickets/TicketDesk';
import CreateTicketModal from '../components/Tickets/CreateTicketModal';
import { getMyTickets, getTicketFeed, refreshTicketPayment } from '../redux/Slices/ticketSlice';
import { getIssueFeed } from '../redux/Slices/issueSlice';
import { getSuggestions } from '../redux/Slices/userSlice';
import TechFeed from '../components/Home/TechFeed';

const Home = () => {
  const dispatch = useDispatch();
  const { rooms, isLoading } = useSelector((state) => state.rooms);
  const { user } = useSelector((state) => state.auth);
  const { feedIssues } = useSelector((state) => state.issues);
  const { suggestions } = useSelector((state) => state.users);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    dispatch(getFeedRooms());
    dispatch(getIssueFeed());
    dispatch(getSuggestions());
  }, [dispatch]);

  useEffect(() => {
    const bookingStatus = searchParams.get('booking');
    const ticketPaymentStatus = searchParams.get('ticket_payment');
    const ticketId = searchParams.get('ticket');

    if (!bookingStatus && !ticketPaymentStatus) return;

    const syncRedirectState = async () => {
      if (bookingStatus === 'success') {
        toast.success('Live Event Booked Successfully!');
      }

      if (ticketPaymentStatus === 'success') {
        if (ticketId) {
          try {
            await dispatch(refreshTicketPayment(ticketId)).unwrap();
            dispatch(getMyTickets());
            dispatch(getTicketFeed());
            toast.success('Ticket bounty authorized. Matching is live.');
          } catch (error) {
            toast.error(error || 'Payment is still pending. Try Check payment on the ticket.');
          }
        } else {
          toast.success('Ticket bounty authorized. Matching will start shortly.');
        }
      }

      if (ticketPaymentStatus === 'cancelled') {
        toast.error('Ticket payment authorization cancelled.');
      }

      setSearchParams({}, { replace: true });
    };

    syncRedirectState();
  }, [dispatch, searchParams, setSearchParams]);

  // Filter for live rooms and scheduled reminders from the backend feed
  const feedRooms = rooms.filter((room) => room.status === 'active' || room.status === 'scheduled');
  const liveCount = feedRooms.filter((room) => room.status === 'active').length;
  const reminderCount = feedRooms.filter((room) => room.status === 'scheduled').length;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader size="lg" text="Loading developer sessions..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Developer dashboard */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 border-0 bg-gradient-primary shadow-sm dark:shadow-glow relative overflow-hidden"
      >
        <div className="relative z-10">
          <h1 className="text-2xl font-display font-bold text-white mb-2 tracking-tight">
            Developer dashboard
          </h1>
          <p className="text-white/90 text-sm md:text-base">
            {user?.displayName ? `${user.displayName.split(' ')[0]}, your stack-aware workspace is ready.` : 'Your stack-aware workspace is ready.'}
          </p>
        </div>
      </motion.div>

      <TechFeed
        rooms={feedRooms}
        issues={feedIssues}
        developers={suggestions}
        user={user}
      />

      <TicketDesk onCreateTicket={() => setTicketModalOpen(true)} />

      {/* Section Header */}
      <div className="flex items-center justify-between mt-8 mb-4">
        <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
          <Radio size={22} className="text-primary-500" />
          Live Sessions
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {liveCount} live{reminderCount > 0 ? ` / ${reminderCount} reminders` : ''}
        </span>
      </div>

      {/* Rooms List */}
      {feedRooms.length > 0 ? (
        <div className="space-y-4">
          {feedRooms.map((room, index) => (
            <RoomCard key={room._id} room={room} index={index} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Radio size={32} />}
          title="No live sessions"
          description={
            user?.following?.length > 0
              ? "Developers you follow have not started any sessions yet."
              : "Follow developers to see their live sessions here."
          }
          action={
            <Link to="/explore">
              <Button leftIcon={<Users size={18} />}>
                Find Developers
              </Button>
            </Link>
          }
        />
      )}

      <CreateTicketModal
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
      />
    </div>
  );
};

export default Home;
