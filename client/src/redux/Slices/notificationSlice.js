import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userAPI } from '../../services/api';

const initialState = {
  notifications: [],
  unreadCount: 0,
  videoCallInvites: [], // For video call notifications
  isLoading: false,
};

// Get notifications
export const getNotifications = createAsyncThunk(
  'notifications/getAll',
  async (_, thunkAPI) => {
    try {
      const response = await userAPI.getNotifications();
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message);
    }
  }
);

// Mark as read
export const markAsRead = createAsyncThunk(
  'notifications/markRead',
  async (_, thunkAPI) => {
    try {
      await userAPI.markNotificationsRead();
      return true;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message);
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // added to beg of  list and removed duplicates if backend sends them
 addNotification: (state, action) => {
  const exists = state.notifications.some(n => n._id === action.payload._id);
  if (!exists) {
    state.notifications.unshift({
      ...action.payload,
      _id: action.payload._id || Date.now().toString(),
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    state.unreadCount += 1;
  }
},

    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    // Video call specific and auto removal after a 30sec timeout
    addVideoCallInvite: (state, action) => {
      const exists = state.videoCallInvites.some(
        (invite) => invite.roomId === action.payload.roomId
      );
      if (!exists) {
        state.videoCallInvites.push({
          ...action.payload,
          timestamp: Date.now(),
          expiresAt: Date.now() + 30000, // 30 seconds expiry
        });
      }
    },
    removeVideoCallInvite: (state, action) => {
      state.videoCallInvites = state.videoCallInvites.filter(
        (invite) => invite.roomId !== action.payload
      );
    },
    clearVideoCallInvites: (state) => {
      state.videoCallInvites = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getNotifications.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter((n) => !n.isRead).length;
      })
      .addCase(markAsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map((n) => ({
          ...n,
          isRead: true,
        }));
        state.unreadCount = 0;
      });
  },
});

export const {
  addNotification,
  clearNotifications,
  addVideoCallInvite,
  removeVideoCallInvite,
  clearVideoCallInvites,
} = notificationSlice.actions;

export default notificationSlice.reducer;