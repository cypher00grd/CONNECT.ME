import { configureStore } from '@reduxjs/toolkit';
import authReducer from './Slices/authSlice';
import roomReducer from './Slices/roomSlice';
import userReducer from './Slices/userSlice';
import notificationReducer from './Slices/notificationSlice';
import themeReducer from './Slices/themeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    rooms: roomReducer,
    users: userReducer,
    notifications: notificationReducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['rooms/addMessage', 'notifications/addNotification'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.createdAt', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['rooms.messages', 'notifications.notifications'],
      },
    }),
  devTools: import.meta.env.DEV,
});

export default store;