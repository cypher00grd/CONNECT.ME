import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Radio, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { getFeedRooms } from '../redux/Slices/roomSlice';
import RoomCard from '../components/Room/RoomCard.jsx';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import { Link } from 'react-router-dom';

const Home = () => {
  const dispatch = useDispatch();
  const { rooms, isLoading } = useSelector((state) => state.rooms);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(getFeedRooms());
  }, [dispatch]);

  // Filter only active rooms
  const activeRooms = rooms.filter((room) => room.status === 'active');

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader size="lg" text="Loading rooms..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 bg-gradient-to-r from-primary-500 to-purple-500"
      >
        <h1 className="text-2xl font-bold text-white mb-2">
          Welcome back, {user?.displayName?.split(' ')[0]}! 👋
        </h1>
        <p className="text-white/80">
          See what's happening with people you follow
        </p>
      </motion.div>

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Radio size={22} className="text-primary-500" />
          Live Rooms
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {activeRooms.length} active
        </span>
      </div>

      {/* Rooms List */}
      {activeRooms.length > 0 ? (
        <div className="space-y-4">
          {activeRooms.map((room, index) => (
            <RoomCard key={room._id} room={room} index={index} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Radio size={32} />}
          title="No active rooms"
          description={
            user?.following?.length > 0
              ? "People you follow haven't started any rooms yet."
              : "Follow some people to see their rooms here!"
          }
          action={
            <Link to="/explore">
              <Button leftIcon={<Users size={18} />}>
                Find People to Follow
              </Button>
            </Link>
          }
        />
      )}
    </div>
  );
};

export default Home;