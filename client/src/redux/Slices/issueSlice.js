import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { issueAPI } from '../../services/api';

const getId = (value) => String(value?._id || value?.issue?._id || value || '');

const upsertById = (items, issue) => {
  if (!issue?._id) return items;
  const index = items.findIndex((item) => getId(item) === getId(issue));
  if (index === -1) return [issue, ...items];

  const next = [...items];
  const existingRequests = next[index].requests || [];
  const incomingRequests = issue.requests || [];
  const mergedRequests = incomingRequests.length > 0
    ? incomingRequests.reduce((requests, request) => {
      const requestIndex = requests.findIndex((item) => getId(item) === getId(request));
      if (requestIndex === -1) return [request, ...requests];
      const copy = [...requests];
      copy[requestIndex] = { ...copy[requestIndex], ...request };
      return copy;
    }, existingRequests)
    : existingRequests;

  next[index] = { ...next[index], ...issue, requests: mergedRequests };
  return next;
};

const removeById = (items, issueId) => items.filter((item) => getId(item) !== getId(issueId));

const issueFromPayload = (payload) => payload?.issue || payload;

const initialState = {
  feedIssues: [],
  myIssues: [],
  isLoading: false,
  isCreating: false,
  actionIssueId: null,
  error: '',
};

export const getIssueFeed = createAsyncThunk('issues/getFeed', async (_, thunkAPI) => {
  try {
    const response = await issueAPI.getFeed();
    return response.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to load issues');
  }
});

export const getMyIssues = createAsyncThunk('issues/getMyIssues', async (_, thunkAPI) => {
  try {
    const response = await issueAPI.getMyIssues();
    return response.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to load your issues');
  }
});

export const createIssue = createAsyncThunk('issues/create', async (issueData, thunkAPI) => {
  try {
    const response = await issueAPI.create(issueData);
    return response.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to post issue');
  }
});

export const requestIssue = createAsyncThunk('issues/request', async ({ issueId, message }, thunkAPI) => {
  try {
    const response = await issueAPI.request(issueId, { message });
    return { issueId, request: response.data.data };
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to send request');
  }
});

export const approveIssueRequest = createAsyncThunk(
  'issues/approveRequest',
  async ({ issueId, requestId }, thunkAPI) => {
    try {
      const response = await issueAPI.approveRequest(issueId, requestId);
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to approve request');
    }
  }
);

export const rejectIssueRequest = createAsyncThunk(
  'issues/rejectRequest',
  async ({ issueId, requestId }, thunkAPI) => {
    try {
      const response = await issueAPI.rejectRequest(issueId, requestId);
      return { issueId, request: response.data.data };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to reject request');
    }
  }
);

export const resolveIssue = createAsyncThunk('issues/resolve', async (issueId, thunkAPI) => {
  try {
    const response = await issueAPI.resolve(issueId);
    return {
      issue: response.data.data,
      payment: response.data.payment,
    };
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to resolve issue');
  }
});

const issueSlice = createSlice({
  name: 'issues',
  initialState,
  reducers: {
    upsertIssue: (state, action) => {
      const issue = issueFromPayload(action.payload);
      if (!issue?._id) return;

      if (issue.status === 'open') {
        state.feedIssues = upsertById(state.feedIssues, issue);
      } else {
        state.feedIssues = removeById(state.feedIssues, issue._id);
      }
      state.myIssues = upsertById(state.myIssues, issue);
    },
    clearIssueError: (state) => {
      state.error = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getIssueFeed.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getIssueFeed.fulfilled, (state, action) => {
        state.isLoading = false;
        state.feedIssues = action.payload;
      })
      .addCase(getIssueFeed.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(getMyIssues.fulfilled, (state, action) => {
        state.myIssues = action.payload;
      })
      .addCase(createIssue.pending, (state) => {
        state.isCreating = true;
        state.error = '';
      })
      .addCase(createIssue.fulfilled, (state, action) => {
        state.isCreating = false;
        state.myIssues = upsertById(state.myIssues, action.payload);
      })
      .addCase(createIssue.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload;
      })
      .addCase(requestIssue.fulfilled, (state, action) => {
        state.actionIssueId = null;
        const issue = state.feedIssues.find((item) => getId(item) === getId(action.payload.issueId));
        if (issue) {
          issue.requestedByMe = true;
        }
      })
      .addCase(approveIssueRequest.fulfilled, (state, action) => {
        state.actionIssueId = null;
        const issue = action.payload?.issue;
        if (!issue?._id) return;
        state.myIssues = upsertById(state.myIssues, issue);
        state.feedIssues = removeById(state.feedIssues, issue._id);
      })
      .addCase(rejectIssueRequest.fulfilled, (state, action) => {
        state.actionIssueId = null;
        const issue = state.myIssues.find((item) => getId(item) === getId(action.payload.issueId));
        if (!issue?.requests) return;
        issue.requests = issue.requests.map((request) => (
          getId(request) === getId(action.payload.request)
            ? { ...request, status: action.payload.request.status }
            : request
        ));
      })
      .addCase(resolveIssue.fulfilled, (state, action) => {
        state.actionIssueId = null;
        const issue = action.payload?.issue;
        if (!issue?._id) return;
        state.myIssues = upsertById(state.myIssues, issue);
        state.feedIssues = removeById(state.feedIssues, issue._id);
      })
      .addMatcher(
        (action) => [
          requestIssue.pending.type,
          approveIssueRequest.pending.type,
          rejectIssueRequest.pending.type,
          resolveIssue.pending.type,
        ].includes(action.type),
        (state, action) => {
          state.actionIssueId = action.meta.arg?.issueId || action.meta.arg;
          state.error = '';
        }
      )
      .addMatcher(
        (action) => [
          requestIssue.rejected.type,
          approveIssueRequest.rejected.type,
          rejectIssueRequest.rejected.type,
          resolveIssue.rejected.type,
        ].includes(action.type),
        (state, action) => {
          state.actionIssueId = null;
          state.error = action.payload;
        }
      );
  },
});

export const { upsertIssue, clearIssueError } = issueSlice.actions;

export default issueSlice.reducer;
