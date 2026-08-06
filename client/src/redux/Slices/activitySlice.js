import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { activityAPI } from '../../services/api';

const initialState = {
  summary: {
    roomsJoined: 0,
    roomsHosted: 0,
    ticketsRaised: 0,
    ticketsAccepted: 0,
    totalMoneySpent: 0,
    totalMoneyEarned: 0,
    developerStats: {
      techBreakdown: [],
      sessionStats: {},
      resolutionRate: 0,
      averageRatingByDomain: [],
      timeline: [],
      badges: [],
    },
  },
  isLoading: false,
  error: '',
};

export const getMyActivity = createAsyncThunk('activity/getMe', async (_, thunkAPI) => {
  try {
    const response = await activityAPI.getMe();
    return response.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to load activity');
  }
});

const activitySlice = createSlice({
  name: 'activity',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getMyActivity.pending, (state) => {
        state.isLoading = true;
        state.error = '';
      })
      .addCase(getMyActivity.fulfilled, (state, action) => {
        state.isLoading = false;
        state.summary = { ...state.summary, ...action.payload };
      })
      .addCase(getMyActivity.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export default activitySlice.reducer;
