import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authAPI } from "../../services/api";
import socketService from "../../services/socket";

// Load from storage
const storedUser = JSON.parse(localStorage.getItem("user"));
const storedToken = localStorage.getItem("token");

const initialState = {
  user: storedUser || null,
  token: storedToken || null,
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
    reset: (s) => {
      s.isLoading = false;
      s.isSuccess = false;
      s.isError = false;
      s.message = "";
    },
  },
  extraReducers: (b) => {
    b.addCase(signup.fulfilled, (s, a) => {
      s.isLoading = false;
      s.isSuccess = true;
      s.user = a.payload.user;
      s.token = a.payload.token;
    })
      .addCase(login.fulfilled, (s, a) => {
        s.isLoading = false;
        s.isSuccess = true;
        s.user = a.payload.user;
        s.token = a.payload.token;
      })
      .addCase(updateProfile.fulfilled, (s, a) => {
        s.user = a.payload;
      })
      .addCase(getMe.fulfilled, (s, a) => {
        s.user = a.payload;
      })
      .addCase(logout.fulfilled, (s) => {
        s.user = null;
        s.token = null;
      })
      .addCase(initializeAuth.fulfilled, (s, a) => {
        if (a.payload) {
          s.user = a.payload;
        }
      });
  },
});

export const { reset } = authSlice.actions;
export default authSlice.reducer;
