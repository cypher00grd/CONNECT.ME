import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authAPI } from "../../services/api";
import socketService from "../../services/socket";

// SAFE LOAD FROM LOCAL STORAGE
// --------------------------------------
const loadUserFromStorage = () => {
  try {
    const storedUser = localStorage.getItem("user");
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      return JSON.parse(storedUser);
    }
    return null;
  } catch (error) {
    console.error("Error parsing user from localStorage:", error);
    localStorage.removeItem("user");
    return null;
  }
};

const loadTokenFromStorage = () => {
  try {
    const token = localStorage.getItem("token");
    if (token && token !== "undefined" && token !== "null") {
      return token;
    }
    return null;
  } catch (error) {
    console.error("Error loading token from localStorage:", error);
    localStorage.removeItem("token");
    return null;
  }
};

const initialState = {
  user: loadUserFromStorage() || null,
  token: loadTokenFromStorage() || null,
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: "",
};

// --------------------------------------
// SIGNUP
// --------------------------------------
export const signup = createAsyncThunk(
  "auth/signup",
  async (userData, thunkAPI) => {
    try {
      const res = await authAPI.signup(userData);

      if (!res.data.success) {
        return thunkAPI.rejectWithValue(res.data.message);
      }

      const { user, token } = res.data.data;

      // Save
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);

      socketService.connect(token);

      return { user, token };
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Signup failed"
      );
    }
  }
);

// --------------------------------------
// LOGIN
// --------------------------------------
export const login = createAsyncThunk(
  "auth/login",
  async (userData, thunkAPI) => {
    try {
      const res = await authAPI.login(userData);

      if (!res.data.success) {
        return thunkAPI.rejectWithValue(res.data.message);
      }

      const { user, token } = res.data.data;

      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);

      socketService.connect(token);

      return { user, token };
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Login failed"
      );
    }
  }
);

// --------------------------------------
// GET ME
// --------------------------------------
export const getMe = createAsyncThunk("auth/getMe", async (_, thunkAPI) => {
  try {
    const res = await authAPI.getMe();
    return res.data.data;
  } catch (err) {
    return thunkAPI.rejectWithValue("Failed to get user");
  }
});

// --------------------------------------
// UPDATE PROFILE
// --------------------------------------
export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (profileData, thunkAPI) => {
    try {
      const res = await authAPI.updateProfile(profileData);

      if (!res.data.success) {
        return thunkAPI.rejectWithValue(res.data.message);
      }

      const updated = res.data.data;

      const current = JSON.parse(localStorage.getItem("user"));
      const merged = { ...current, ...updated };

      localStorage.setItem("user", JSON.stringify(merged));

      return merged;
    } catch (err) {
      return thunkAPI.rejectWithValue("Failed to update profile");
    }
  }
);

// --------------------------------------
// LOGOUT
// --------------------------------------
export const logout = createAsyncThunk("auth/logout", async () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  socketService.disconnect();
  return true;
});

// --------------------------------------
// INITIALIZE SESSION (On App Load)
// --------------------------------------
export const initializeAuth = createAsyncThunk(
  "auth/initialize",
  async (_, thunkAPI) => {
    const token = localStorage.getItem("token");

    if (!token) return null;

    socketService.connect(token);

    try {
      const res = await authAPI.getMe();
      const freshUser = res.data.data;

      localStorage.setItem("user", JSON.stringify(freshUser));
      return freshUser;
    } catch {
      localStorage.clear();
      return thunkAPI.rejectWithValue("Session expired");
    }
  }
);

// --------------------------------------
// SLICE
// --------------------------------------
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Reset flags
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
    },

    // Update entire following array
    updateUserFollowing: (state, action) => {
      if (state.user) {
        state.user.following = action.payload;
        localStorage.setItem("user", JSON.stringify(state.user));
      }
    },

    // Add a user ID to following list
    addToFollowing: (state, action) => {
      if (state.user) {
        const userId = action.payload;
        if (!state.user.following) {
          state.user.following = [];
        }
        if (!state.user.following.includes(userId)) {
          state.user.following.push(userId);
          localStorage.setItem("user", JSON.stringify(state.user));
        }
      }
    },

    // Remove a user ID from following list
    removeFromFollowing: (state, action) => {
      if (state.user && state.user.following) {
        const userId = action.payload;
        state.user.following = state.user.following.filter(
          (id) => id !== userId
        );
        localStorage.setItem("user", JSON.stringify(state.user));
      }
    },

    // Update user data directly
    setUser: (state, action) => {
      state.user = action.payload;
      localStorage.setItem("user", JSON.stringify(action.payload));
    },
  },

  extraReducers: (builder) => {
    builder
      // SIGNUP
      .addCase(signup.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = "";
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(signup.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.user = null;
        state.token = null;
      })

      // LOGIN
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = "";
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.user = null;
        state.token = null;
      })

      // GET ME
      .addCase(getMe.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload };
      })

      // UPDATE PROFILE
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // LOGOUT
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isSuccess = false;
      })

      // INITIALIZE
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.user = action.payload;
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
      });
  },
});

// Export actions
export const {
  reset,
  updateUserFollowing,
  addToFollowing,
  removeFromFollowing,
  setUser,
} = authSlice.actions;

export default authSlice.reducer;