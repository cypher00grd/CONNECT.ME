import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { roomAPI } from '../../services/api';

const initialState = {
  rooms: [],
  currentRoom: null,
  messages: [],
  typingUsers: [],
  videoCallActive: false,
  videoCallParticipants: [],
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: '',
};

// Get feed rooms
export const getFeedRooms = createAsyncThunk(
  'rooms/getFeed',
  async (_, thunkAPI) => {
    try {
      const response = await roomAPI.getFeed();
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get rooms';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get my rooms
export const getMyRooms = createAsyncThunk(
  'rooms/getMyRooms',
  async (_, thunkAPI) => {
    try {
      const response = await roomAPI.getMyRooms();
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get rooms';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create room
export const createRoom = createAsyncThunk(
  'rooms/create',
  async (roomData, thunkAPI) => {
    try {
      const response = await roomAPI.create(roomData);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create room';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get single room
export const getRoom = createAsyncThunk(
  'rooms/getRoom',
  async (roomId, thunkAPI) => {
    try {
      const response = await roomAPI.getRoom(roomId);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get room';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Join room
export const joinRoom = createAsyncThunk(
  'rooms/join',
  async (roomId, thunkAPI) => {
    try {
      const response = await roomAPI.join(roomId);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to join room';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Leave room
export const leaveRoom = createAsyncThunk(
  'rooms/leave',
  async (roomId, thunkAPI) => {
    try {
      await roomAPI.leave(roomId);
      return roomId;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to leave room';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// End room
export const endRoom = createAsyncThunk(
  'rooms/end',
  async (roomId, thunkAPI) => {
    try {
      await roomAPI.destroy(roomId);
      return roomId;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to end room';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get room messages
export const getRoomMessages = createAsyncThunk(
  'rooms/getMessages',
  async (roomId, thunkAPI) => {
    try {
      const response = await roomAPI.getMessages(roomId);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get messages';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const roomSlice = createSlice({
  name: 'rooms',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    clearCurrentRoom: (state) => {
      state.currentRoom = null;
      state.messages = [];
      state.typingUsers = [];
      state.videoCallActive = false;
      state.videoCallParticipants = [];
    },
    addMessage: (state, action) => {
      // Prevent duplicates
      const exists = state.messages.some((m) => m._id === action.payload._id);
      if (!exists) {
        state.messages.push(action.payload);
      }
    },
    addRoom: (state, action) => {
      const exists = state.rooms.find((r) => r._id === action.payload._id);
      if (!exists) {
        state.rooms.unshift(action.payload);
      }
    },
    updateRoom: (state, action) => {
      const index = state.rooms.findIndex((r) => r._id === action.payload._id);
      if (index !== -1) {
        state.rooms[index] = { ...state.rooms[index], ...action.payload };
      }
      if (state.currentRoom?._id === action.payload._id) {
        state.currentRoom = { ...state.currentRoom, ...action.payload };
      }
    },
    removeRoom: (state, action) => {
      state.rooms = state.rooms.filter((r) => r._id !== action.payload);
      if (state.currentRoom?._id === action.payload) {
        state.currentRoom = null;
      }
    },
    setRoomEnded: (state, action) => {
      const roomId = action.payload;
      if (state.currentRoom?._id === roomId) {
        state.currentRoom.status = 'ended';
      }
      const roomIndex = state.rooms.findIndex((r) => r._id === roomId);
      if (roomIndex !== -1) {
        state.rooms[roomIndex].status = 'ended';
      }
    },
    addParticipant: (state, action) => {
      const { roomId, user } = action.payload;
      if (state.currentRoom?._id === roomId) {
        const exists = state.currentRoom.participants.some(
          (p) => (p.user?._id || p.user) === user._id
        );
        if (!exists) {
          state.currentRoom.participants.push({ user, joinedAt: new Date() });
        }
      }
    },
    removeParticipant: (state, action) => {
      const { roomId, userId } = action.payload;
      if (state.currentRoom?._id === roomId) {
        state.currentRoom.participants = state.currentRoom.participants.filter(
          (p) => (p.user?._id || p.user) !== userId
        );
      }
    },
    addTypingUser: (state, action) => {
      if (!state.typingUsers.includes(action.payload)) {
        state.typingUsers.push(action.payload);
      }
    },
    removeTypingUser: (state, action) => {
      state.typingUsers = state.typingUsers.filter((u) => u !== action.payload);
    },
    // Video call actions
    setVideoCallActive: (state, action) => {
      state.videoCallActive = action.payload;
    },
    addVideoCallParticipant: (state, action) => {
      const exists = state.videoCallParticipants.some(
        (p) => p._id === action.payload._id
      );
      if (!exists) {
        state.videoCallParticipants.push(action.payload);
      }
    },
    removeVideoCallParticipant: (state, action) => {
      state.videoCallParticipants = state.videoCallParticipants.filter(
        (p) => p._id !== action.payload
      );
    },
    clearVideoCall: (state) => {
      state.videoCallActive = false;
      state.videoCallParticipants = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Feed Rooms
      .addCase(getFeedRooms.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getFeedRooms.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.rooms = action.payload;
      })
      .addCase(getFeedRooms.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get My Rooms
      .addCase(getMyRooms.fulfilled, (state, action) => {
        state.rooms = action.payload;
      })
      // Create Room
      .addCase(createRoom.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.rooms.unshift(action.payload);
        state.currentRoom = action.payload;
      })
      .addCase(createRoom.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get Room
      .addCase(getRoom.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getRoom.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRoom = action.payload;
      })
      .addCase(getRoom.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Join Room
      .addCase(joinRoom.fulfilled, (state, action) => {
        state.currentRoom = action.payload;
      })
      // Leave Room
      .addCase(leaveRoom.fulfilled, (state) => {
        state.currentRoom = null;
        state.messages = [];
        state.typingUsers = [];
        state.videoCallActive = false;
        state.videoCallParticipants = [];
      })
      // End Room
      .addCase(endRoom.fulfilled, (state, action) => {
        state.rooms = state.rooms.filter((r) => r._id !== action.payload);
        if (state.currentRoom?._id === action.payload) {
          state.currentRoom.status = 'ended';
        }
      })
      // Get Messages
      .addCase(getRoomMessages.fulfilled, (state, action) => {
        state.messages = action.payload;
      });
  },
});

export const {
  reset,
  clearCurrentRoom,
  addMessage,
  addRoom,
  updateRoom,
  removeRoom,
  setRoomEnded,
  addParticipant,
  removeParticipant,
  addTypingUser,
  removeTypingUser,
  setVideoCallActive,
  addVideoCallParticipant,
  removeVideoCallParticipant,
  clearVideoCall,
} = roomSlice.actions;

export default roomSlice.reducer;