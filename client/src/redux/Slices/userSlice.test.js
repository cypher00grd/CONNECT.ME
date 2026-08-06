import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  search: vi.fn(),
  getSuggestions: vi.fn(),
  getProfile: vi.fn(),
  follow: vi.fn(),
  unfollow: vi.fn()
}));

vi.mock('../../services/api', () => ({ userAPI: apiMocks }));

import reducer, {
  clearSearchResults,
  clearViewedProfile,
  followUser,
  getSuggestions,
  getUserProfile,
  searchUsers,
  unfollowUser,
  updateFollowStatus
} from './userSlice';

const createStore = (users) => configureStore({
  reducer: { users: reducer },
  ...(users ? { preloadedState: { users } } : {})
});

beforeEach(() => vi.clearAllMocks());

describe('user discovery state', () => {
  it('ignores stale suggestion responses', () => {
    let state = reducer(undefined, { type: 'test/init' });
    state = reducer(state, getSuggestions.pending('older-request', {}));
    state = reducer(state, getSuggestions.pending('newer-request', {}));
    state = reducer(state, getSuggestions.fulfilled([{ _id: 'old' }], 'older-request', {}));
    expect(state.suggestions).toEqual([]);
    expect(state.isLoading).toBe(true);

    state = reducer(state, getSuggestions.fulfilled([{ _id: 'new' }], 'newer-request', {}));
    expect(state.suggestions).toEqual([{ _id: 'new' }]);
    expect(state.isLoading).toBe(false);
  });

  it('clears search/profile state and updates follow status everywhere', () => {
    const base = {
      ...reducer(undefined, { type: 'test/init' }),
      searchResults: [{ _id: 'one', isFollowing: false }],
      suggestions: [{ _id: 'one' }, { _id: 'two' }],
      viewedProfile: { _id: 'one', isFollowing: false, followers: [] },
      isSearching: true,
      searchRequestId: 'active'
    };

    const followed = reducer(base, updateFollowStatus({ userId: 'one', isFollowing: true }));
    expect(followed.searchResults[0].isFollowing).toBe(true);
    expect(followed.suggestions).toEqual([{ _id: 'two' }]);
    expect(followed.viewedProfile.isFollowing).toBe(true);

    const unfollowed = reducer(followed, updateFollowStatus({ userId: 'one', isFollowing: false }));
    expect(unfollowed.searchResults[0].isFollowing).toBe(false);
    expect(unfollowed.viewedProfile.isFollowing).toBe(false);
    expect(reducer(base, clearSearchResults())).toMatchObject({ searchResults: [], isSearching: false, searchRequestId: null });
    expect(reducer(base, clearViewedProfile()).viewedProfile).toBeNull();
  });

  it('runs search and suggestion thunks successfully', async () => {
    apiMocks.search.mockResolvedValue({ data: { data: [{ _id: 'search-result' }] } });
    apiMocks.getSuggestions.mockResolvedValue({ data: { data: [{ _id: 'suggestion' }] } });
    const store = createStore();

    await store.dispatch(searchUsers({ query: 'react' }));
    expect(apiMocks.search).toHaveBeenCalledWith({ query: 'react' });
    expect(store.getState().users.searchResults).toEqual([{ _id: 'search-result' }]);

    await store.dispatch(getSuggestions({ tech: 'react' }));
    expect(apiMocks.getSuggestions).toHaveBeenCalledWith({ tech: 'react' });
    expect(store.getState().users.suggestions).toEqual([{ _id: 'suggestion' }]);
  });

  it('stores API error messages for search and suggestions', async () => {
    apiMocks.search.mockRejectedValue({ response: { data: { message: 'Search unavailable' } } });
    apiMocks.getSuggestions.mockRejectedValue(new Error('offline'));
    const store = createStore();

    await store.dispatch(searchUsers('react'));
    expect(store.getState().users).toMatchObject({ isError: true, message: 'Search unavailable' });
    await store.dispatch(getSuggestions());
    expect(store.getState().users.message).toBe('Failed to get suggestions');
  });

  it('loads and rejects profiles', async () => {
    apiMocks.getProfile.mockResolvedValueOnce({ data: { data: { _id: 'profile-one' } } });
    const store = createStore();
    await store.dispatch(getUserProfile('profile-one'));
    expect(store.getState().users.viewedProfile).toEqual({ _id: 'profile-one' });

    apiMocks.getProfile.mockRejectedValueOnce({ response: { data: { message: 'Profile missing' } } });
    await store.dispatch(getUserProfile('missing'));
    expect(store.getState().users).toMatchObject({ isError: true, message: 'Profile missing' });
  });

  it('applies follow and unfollow results to cards and profiles', async () => {
    apiMocks.follow.mockResolvedValue({ data: { success: true } });
    apiMocks.unfollow.mockResolvedValue({ data: { success: true } });
    const seeded = {
      ...reducer(undefined, { type: 'test/init' }),
      searchResults: [{ _id: 'target', isFollowing: false }],
      suggestions: [{ _id: 'target' }],
      viewedProfile: { _id: 'target', isFollowing: false, followers: [] }
    };
    const store = createStore(seeded);

    await store.dispatch(followUser('target'));
    expect(store.getState().users.searchResults[0].isFollowing).toBe(true);
    expect(store.getState().users.suggestions).toEqual([]);
    expect(store.getState().users.viewedProfile.followers).toEqual([{ _id: 'temp' }]);

    await store.dispatch(unfollowUser('target'));
    expect(store.getState().users.searchResults[0].isFollowing).toBe(false);
    expect(store.getState().users.viewedProfile.followers).toEqual([]);
  });

  it('returns safe fallback errors from follow thunks', async () => {
    apiMocks.follow.mockRejectedValue(new Error('offline'));
    apiMocks.unfollow.mockRejectedValue({ response: { data: { message: 'Cannot unfollow' } } });
    const store = createStore();
    const followResult = await store.dispatch(followUser('target'));
    const unfollowResult = await store.dispatch(unfollowUser('target'));
    expect(followResult.payload).toBe('Failed to follow user');
    expect(unfollowResult.payload).toBe('Cannot unfollow');
  });
});
