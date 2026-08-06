import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authAPI, clearAccessToken, setAccessToken } from "../../services/api";
import socketService from "../../services/socket";

const getId = (value) => {
  if (!value) return "";
  return String(value._id || value);
};

const isSameId = (left, right) => getId(left) === getId(right);

const normalizeIdList = (values = [], ownUserId = "") => {
  const seen = new Set();
  return values
    .map(getId)
    .filter(Boolean)
    .filter((id) => !isSameId(id, ownUserId))
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
};

const sanitizeUser = (user) => {
  if (!user) return null;

  return {
    ...user,
    followers: normalizeIdList(user.followers || [], user._id),
    following: normalizeIdList(user.following || [], user._id),
  };
};

const getApiErrorMessage = (error, fallback) => {
  const responseData = error.response?.data;
  const fieldError = Array.isArray(responseData?.errors)
    ? responseData.errors.find((item) => item?.message)
    : null;

  if (responseData?.message && responseData.message !== "Invalid request data") {
    return responseData.message;
  }

  if (fieldError) {
    const fieldName = fieldError.path
      ? `${fieldError.path.charAt(0).toUpperCase()}${fieldError.path.slice(1)}: `
      : "";
    return `${fieldName}${fieldError.message}`;
  }

  return responseData?.message || fallback;
};

// SAFE LOAD FROM LOCAL STORAGE
// --------------------------------------
const loadUserFromStorage = () => {
  try {
    const storedUser = localStorage.getItem("user");
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      return sanitizeUser(JSON.parse(storedUser));
    }
    return null;
  } catch (error) {
    console.error("Error parsing user from localStorage:", error);
    localStorage.removeItem("user");
    return null;
  }
};

const initialState = {
  user: loadUserFromStorage() || null,
  token: null,
  initialized: false, // To track if initialization has completed
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

      const { token, ...user } = res.data.data;
      const safeUser = sanitizeUser(user);

      localStorage.setItem("user", JSON.stringify(safeUser));
      localStorage.removeItem("token");
      setAccessToken(token);

      socketService.connect(token);

      return { user: safeUser, token };
    } catch (err) {
      clearAccessToken();
      return thunkAPI.rejectWithValue(getApiErrorMessage(err, "Signup failed"));
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

      const { token, ...user } = res.data.data;
      const safeUser = sanitizeUser(user);

      localStorage.setItem("user", JSON.stringify(safeUser));
      localStorage.removeItem("token");
      setAccessToken(token);

      socketService.connect(token);

      return { user: safeUser, token };
    } catch (err) {
      clearAccessToken();
      return thunkAPI.rejectWithValue(getApiErrorMessage(err, "Login failed"));
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
  } catch {
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
      const merged = sanitizeUser({ ...current, ...updated });

      localStorage.setItem("user", JSON.stringify(merged));

      return merged;
    } catch {
      return thunkAPI.rejectWithValue("Failed to update profile");
    }
  }
);

// --------------------------------------
// LOGOUT
// --------------------------------------
export const logout = createAsyncThunk("auth/logout", async () => {
  try {
    await authAPI.logout();
  } catch {
    // Local logout should still clear client state if the server session is already gone.
  }

  localStorage.removeItem("user");
  localStorage.removeItem("token");
  clearAccessToken();
  socketService.disconnect();
  return true;
});

// --------------------------------------
// INITIALIZE SESSION (On App Load)
// --------------------------------------
export const initializeAuth = createAsyncThunk(
  "auth/initialize",
  async (_, thunkAPI) => {
    try {
      localStorage.removeItem("token");
      if (!localStorage.getItem("user")) {
        clearAccessToken();
        return null;
      }

      const res = await authAPI.refresh();
      const { token, ...user } = res.data.data;
      const freshUser = sanitizeUser(user);

      setAccessToken(token);
      localStorage.setItem("user", JSON.stringify(freshUser));
      socketService.connect(token);

      return { user: freshUser, token };
    } catch {
      clearAccessToken();
      localStorage.removeItem("user");
      localStorage.removeItem("token");
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
        state.user.following = normalizeIdList(action.payload, state.user._id);
        localStorage.setItem("user", JSON.stringify(state.user));
      }
    },

    // Add a user ID to following list
    addToFollowing: (state, action) => {
      if (state.user) {
        const userId = getId(action.payload);
        if (!userId || isSameId(userId, state.user._id)) return;

        if (!state.user.following) {
          state.user.following = [];
        }
        state.user.following = normalizeIdList(state.user.following, state.user._id);

        if (!state.user.following.some((id) => isSameId(id, userId))) {
          state.user.following.push(userId);
          localStorage.setItem("user", JSON.stringify(state.user));
        }
      }
    },

    // Remove a user ID from following list
    removeFromFollowing: (state, action) => {
      if (state.user && state.user.following) {
        const userId = getId(action.payload);
        state.user.following = state.user.following.filter(
          (id) => !isSameId(id, userId)
        );
        localStorage.setItem("user", JSON.stringify(state.user));
      }
    },

    // Update user data directly
    setUser: (state, action) => {
      state.user = sanitizeUser(action.payload);
      localStorage.setItem("user", JSON.stringify(state.user));
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
        state.user = sanitizeUser({ ...state.user, ...action.payload });
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
        state.initialized = true;
        if (action.payload) {
          state.user = sanitizeUser(action.payload.user) || null;
          state.token = action.payload.token || null;
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
        state.initialized = true;
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
