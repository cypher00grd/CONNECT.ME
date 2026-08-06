import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Bug, Radio, RotateCcw, SlidersHorizontal, TrendingUp, Users } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getSuggestions } from '../redux/Slices/userSlice';
import { getIssueFeed, requestIssue } from '../redux/Slices/issueSlice';
import { getFeedRooms } from '../redux/Slices/roomSlice';
import UserCard from '../components/User/UserCard';
import SearchUsers from '../components/User/SearchUsers';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import IssueCard from '../components/Issues/IssueCard';
import RoomCard from '../components/Room/RoomCard';
import TechTagAutocomplete from '../components/common/TechTagAutocomplete';
import { EXPERIENCE_LEVELS, SPECIALIZATIONS } from '../utils/constants';

const Explore = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { suggestions, isLoading } = useSelector((state) => state.users);
  const { feedIssues, isLoading: issuesLoading, actionIssueId } = useSelector((state) => state.issues);
  const { rooms, isLoading: roomsLoading } = useSelector((state) => state.rooms);
  const [activeTab, setActiveTab] = useState('developers');
  const [peopleTab, setPeopleTab] = useState('suggestions');
  const [filters, setFilters] = useState({
    tech: [],
    specialization: '',
    experienceLevel: '',
    openToMentor: false,
  });

  useEffect(() => {
    dispatch(getIssueFeed());
    dispatch(getFeedRooms());
  }, [dispatch]);

  const techFilter = filters.tech.join(',');
  const hasFilters = Boolean(
    techFilter || filters.specialization || filters.experienceLevel || filters.openToMentor
  );
  const displayUsers = suggestions;
  const sortedUsers = peopleTab === 'popular'
    ? [...displayUsers].sort((left, right) => (
      (right.rating || 0) - (left.rating || 0) ||
      (right.followersCount || right.followers?.length || 0) - (left.followersCount || left.followers?.length || 0) ||
      (right.reputationPoints || 0) - (left.reputationPoints || 0)
    ))
    : displayUsers;
  const liveSessions = rooms.filter((room) => room.status === 'active');

  useEffect(() => {
    if (activeTab !== 'developers') return;

    dispatch(getSuggestions({
      ...(techFilter && { tech: techFilter }),
      ...(filters.specialization && { specialization: filters.specialization }),
      ...(filters.experienceLevel && { experienceLevel: filters.experienceLevel }),
      ...(filters.openToMentor && { openToMentor: 'true' }),
    }));
  }, [activeTab, techFilter, filters.specialization, filters.experienceLevel, filters.openToMentor, dispatch]);

  const clearFilters = () => {
    setFilters({
      tech: [],
      specialization: '',
      experienceLevel: '',
      openToMentor: false,
    });
  };

  const handleRequestIssue = async (issue, message) => {
    try {
      await dispatch(requestIssue({ issueId: issue._id, message })).unwrap();
      toast.success('Request sent');
    } catch (error) {
      toast.error(error || 'Failed to send request');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Explore
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Discover developers, open issues, and live engineering sessions.
        </p>
      </Motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('developers')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors
            ${activeTab === 'developers'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
            }
          `}
        >
          <Users size={18} />
          Developers
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors
            ${activeTab === 'issues'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
            }
          `}
        >
          <Bug size={18} />
          Open Issues
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors
            ${activeTab === 'sessions'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
            }
          `}
        >
          <Radio size={18} />
          Live Sessions
        </button>
      </div>

      {activeTab === 'developers' ? (
        <>
          <SearchUsers />

          <div className="card p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                <SlidersHorizontal size={18} className="text-primary-500" />
                <h2 className="font-display font-bold">Developer filters</h2>
              </div>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-500 hover:text-primary-600"
                >
                  <RotateCcw size={15} />
                  Clear
                </button>
              )}
            </div>
            <TechTagAutocomplete
              label="Tech stack"
              value={filters.tech}
              onChange={(tech) => setFilters((prev) => ({ ...prev, tech }))}
              helperText="Match languages, frameworks, tools, and related tags."
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={filters.specialization}
                onChange={(event) => setFilters((prev) => ({ ...prev, specialization: event.target.value }))}
                className="input-field"
              >
                <option value="">Any specialization</option>
                {SPECIALIZATIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <select
                value={filters.experienceLevel}
                onChange={(event) => setFilters((prev) => ({ ...prev, experienceLevel: event.target.value }))}
                className="input-field"
              >
                <option value="">Any experience</option>
                {EXPERIENCE_LEVELS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-dark-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={filters.openToMentor}
                  onChange={(event) => setFilters((prev) => ({ ...prev, openToMentor: event.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                Open to mentor
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPeopleTab('suggestions')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors
                ${peopleTab === 'suggestions'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                }
              `}
            >
              <TrendingUp size={18} />
              Suggested
            </button>
            <button
              onClick={() => setPeopleTab('popular')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors
                ${peopleTab === 'popular'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                }
              `}
            >
              <Users size={18} />
              Popular
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader size="lg" />
            </div>
          ) : sortedUsers.length > 0 ? (
            <div className="space-y-3">
              {sortedUsers.map((suggestedUser, index) => (
                <UserCard key={suggestedUser._id} user={suggestedUser} index={index} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Users size={32} />}
              title={hasFilters ? 'No matching developers' : 'No suggestions'}
              description={hasFilters
                ? 'Try removing a filter or choosing a broader technology.'
                : 'No developers are available in this discovery view yet.'}
            />
          )}
        </>
      ) : activeTab === 'issues' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">
                Open Issues
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Send a request when you can help.
              </p>
            </div>
          </div>

          {issuesLoading ? (
            <div className="flex justify-center py-10">
              <Loader size="lg" />
            </div>
          ) : feedIssues.length > 0 ? (
            <div className="space-y-3">
              {feedIssues.map((issue) => (
                <IssueCard
                  key={issue._id}
                  issue={issue}
                  currentUserId={user?._id}
                  mode="feed"
                  onRequest={handleRequestIssue}
                  isBusy={actionIssueId === issue._id}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Bug size={32} />}
              title="No open issues"
              description="Posted issues from other people will appear here."
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">
              Live Sessions
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Active engineering rooms you can join based on existing room access.
            </p>
          </div>

          {roomsLoading ? (
            <div className="flex justify-center py-10">
              <Loader size="lg" />
            </div>
          ) : liveSessions.length > 0 ? (
            <div className="space-y-3">
              {liveSessions.map((room, index) => (
                <RoomCard key={room._id} room={room} index={index} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Radio size={32} />}
              title="No live sessions"
              description="Developer rooms will appear here when they go live."
            />
          )}
        </div>
      )}

    </div>
  );
};

export default Explore;
