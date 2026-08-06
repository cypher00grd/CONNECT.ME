import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Search, X, Loader2 } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { searchUsers, clearSearchResults } from '../../redux/Slices/userSlice';
import Avatar from '../common/Avatar';

const getTechPreview = (user = {}) => {
  const stack = user.techStack || {};
  return [
    user.specialization,
    ...(stack.languages || []),
    ...(stack.frameworks || []),
    ...(stack.tools || []),
  ].filter(Boolean).slice(0, 3);
};

const SearchUsers = ({ onSelect }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { searchResults, isSearching } = useSelector((state) => state.users);

  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Debounce search without sharing a stale callback between query changes.
  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      dispatch(clearSearchResults());
      return undefined;
    }

    dispatch(clearSearchResults());
    const timer = setTimeout(() => {
      dispatch(searchUsers(value));
    }, 300);

    return () => clearTimeout(timer);
  }, [query, dispatch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (user) => {
    navigate(`/profile/${user.username}`);
    setQuery('');
    setIsFocused(false);
    dispatch(clearSearchResults());
    onSelect?.();
  };

  const handleClear = () => {
    setQuery('');
    dispatch(clearSearchResults());
    inputRef.current?.focus();
  };

  const showResults =
    isFocused &&
    (searchResults.length > 0 || (query.length >= 2 && !isSearching));

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search developers..."
          className="w-full pl-10 pr-10 py-2.5 bg-gray-100 dark:bg-dark-700 rounded-full text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
        />

        {/* Right-side icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <Loader2 size={18} className="text-gray-400 animate-spin" />
          ) : (
            query && (
              <button
                onClick={handleClear}
                className="p-1 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-full transition-colors"
              >
                <X size={16} className="text-gray-400" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {showResults && (
          <Motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-gray-100 dark:border-dark-700 overflow-hidden z-50"
          >
            {searchResults.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => handleSelect(user)}
                    className="flex items-center gap-3 w-full p-3 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                  >
                    <Avatar
                      src={user.avatar}
                      name={user.displayName}
                      size="md"
                    />

                    <div className="text-left min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {user.displayName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        @{user.username}
                      </p>
                      {getTechPreview(user).length > 0 && (
                        <p className="text-xs text-gray-400 truncate">
                          {getTechPreview(user).join(' · ')}
                        </p>
                      )}
                    </div>

                    {user.isFollowing && (
                      <span className="ml-auto text-xs text-gray-400">
                        Following
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : query.length >= 2 && !isSearching ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No developers found for "{query}"
              </div>
            ) : null}
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchUsers;
