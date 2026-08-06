import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userAPI } from '../../services/api';

const initialState = {
  searchResults: [],
  suggestions: [],
  viewedProfile: null,
  isLoading: false,
  isSearching: false,
  searchRequestId: null,
  suggestionsRequestId: null,
  isError: false,
  message: '',
};

// Search users
export const searchUsers = createAsyncThunk(
  'users/search',
  async (query, thunkAPI) => {
    try {
      const response = await userAPI.search(query);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Search failed';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get suggestions
export const getSuggestions = createAsyncThunk(
  'users/suggestions',
  async (filters = {}, thunkAPI) => {
    try {
      const response = await userAPI.getSuggestions(filters);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get suggestions';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get user profile
export const getUserProfile = createAsyncThunk(
  'users/getProfile',
  async (username, thunkAPI) => {
    try {
      const response = await userAPI.getProfile(username);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get profile';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Follow user
export const followUser = createAsyncThunk(
  'users/follow',
  async (userId, thunkAPI) => {
    try {
      await userAPI.follow(userId);
      return userId;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to follow user';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Unfollow user
export const unfollowUser = createAsyncThunk(
  'users/unfollow',
  async (userId, thunkAPI) => {
    try {
      await userAPI.unfollow(userId);
      return userId;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to unfollow user';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchRequestId = null;
      state.isSearching = false;
    },
    clearViewedProfile: (state) => {
      state.viewedProfile = null;
    },
    updateFollowStatus: (state, action) => {
      const { userId, isFollowing } = action.payload;
      
      // Update in search results
      state.searchResults = state.searchResults.map((user) =>
        user._id === userId ? { ...user, isFollowing } : user
      );
      
      // Update in suggestions (remove if followed)
      if (isFollowing) {
        state.suggestions = state.suggestions.filter((user) => user._id !== userId);
      }
      
      // Update viewed profile
      if (state.viewedProfile?._id === userId) {
        state.viewedProfile.isFollowing = isFollowing;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Search
      .addCase(searchUsers.pending, (state, action) => {
        state.isSearching = true;
        state.searchRequestId = action.meta.requestId;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        if (state.searchRequestId !== action.meta.requestId) return;
        state.isSearching = false;
        state.searchRequestId = null;
        state.searchResults = action.payload;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        if (state.searchRequestId !== action.meta.requestId) return;
        state.isSearching = false;
        state.searchRequestId = null;
        state.isError = true;
        state.message = action.payload;
      })
      // Suggestions
      .addCase(getSuggestions.pending, (state, action) => {
        state.isLoading = true;
        state.suggestionsRequestId = action.meta.requestId;
      })
      .addCase(getSuggestions.fulfilled, (state, action) => {
        if (state.suggestionsRequestId !== action.meta.requestId) return;
        state.isLoading = false;
        state.suggestionsRequestId = null;
        state.suggestions = action.payload;
      })
      .addCase(getSuggestions.rejected, (state, action) => {
        if (state.suggestionsRequestId !== action.meta.requestId) return;
        state.isLoading = false;
        state.suggestionsRequestId = null;
        state.message = action.payload;
      })
      // Get Profile
      .addCase(getUserProfile.pending, (state) => {
        state.isLoading = true;
        state.viewedProfile = null;
      })
      .addCase(getUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.viewedProfile = action.payload;
      })
      .addCase(getUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Follow
      .addCase(followUser.fulfilled, (state, action) => {
        const userId = action.payload;
        
        // Update search results
        state.searchResults = state.searchResults.map((user) =>
          user._id === userId ? { ...user, isFollowing: true } : user
        );
        
        // Remove from suggestions
        state.suggestions = state.suggestions.filter((user) => user._id !== userId);
        
        // Update viewed profile
        if (state.viewedProfile?._id === userId) {
          state.viewedProfile.isFollowing = true;
          state.viewedProfile.followers = [
            ...state.viewedProfile.followers,
            { _id: 'temp' },
          ];
        }
      })
      // Unfollow
      .addCase(unfollowUser.fulfilled, (state, action) => {
        const userId = action.payload;
        
        // Update search results
        state.searchResults = state.searchResults.map((user) =>
          user._id === userId ? { ...user, isFollowing: false } : user
        );
        
        // Update viewed profile
        if (state.viewedProfile?._id === userId) {
          state.viewedProfile.isFollowing = false;
          state.viewedProfile.followers = state.viewedProfile.followers.filter(
            (f) => f._id !== 'temp'
          );
        }
      });
  },
});

export const { clearSearchResults, clearViewedProfile, updateFollowStatus } = userSlice.actions;
export default userSlice.reducer;
