import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { getSuggestions } from '../redux/Slices/userSlice';
import UserCard from '../components/User/userCard';
import SearchUsers from '../components/User/SearchUsers';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';

const Explore = () => {
  const dispatch = useDispatch();
  const { suggestions, searchResults, isLoading, isSearching } = useSelector((state) => state.users);
  const [activeTab, setActiveTab] = useState('suggestions');

  useEffect(() => {
    dispatch(getSuggestions());
  }, [dispatch]);

  const displayUsers = searchResults.length > 0 ? searchResults : suggestions;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Explore
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Discover new people to follow
        </p>
      </motion.div>

      {/* Search */}
      <SearchUsers />

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors
            ${activeTab === 'suggestions'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
            }
          `}
        >
          <TrendingUp size={18} />
          Suggested
        </button>
        <button
          onClick={() => setActiveTab('popular')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors
            ${activeTab === 'popular'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
            }
          `}
        >
          <Users size={18} />
          Popular
        </button>
      </div>

      {/* Users List */}
      {isLoading || isSearching ? (
        <div className="flex justify-center py-10">
          <Loader size="lg" />
        </div>
      ) : displayUsers.length > 0 ? (
        <div className="space-y-3">
          {displayUsers.map((user, index) => (
            <UserCard key={user._id} user={user} index={index} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Users size={32} />}
          title="No suggestions"
          description="We couldn't find any users to suggest. Try searching for specific people!"
        />
      )}
    </div>
  );
};

export default Explore;