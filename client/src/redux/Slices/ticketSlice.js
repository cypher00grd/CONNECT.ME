import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ticketAPI } from '../../services/api';

const getTicketId = (value) => String(value?._id || value?.ticket?._id || value || '');

const upsertById = (items, ticket) => {
  if (!ticket?._id) return items;

  const index = items.findIndex((item) => getTicketId(item) === getTicketId(ticket));
  if (index === -1) {
    return [ticket, ...items];
  }

  const next = [...items];
  next[index] = { ...next[index], ...ticket };
  return next;
};

const removeById = (items, ticketId) => (
  items.filter((item) => getTicketId(item) !== getTicketId(ticketId))
);

const ticketFromPayload = (payload) => payload?.ticket || payload;

const initialState = {
  feedTickets: [],
  myTickets: [],
  incomingPings: [],
  pendingReview: null,
  roomToJoin: null,
  isLoading: false,
  isCreating: false,
  actionTicketId: null,
  error: '',
};

export const getTicketFeed = createAsyncThunk(
  'tickets/getFeed',
  async (_, thunkAPI) => {
    try {
      const response = await ticketAPI.getFeed();
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to load tickets');
    }
  }
);

export const getMyTickets = createAsyncThunk(
  'tickets/getMyTickets',
  async (_, thunkAPI) => {
    try {
      const response = await ticketAPI.getMyTickets();
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to load your tickets');
    }
  }
);

export const createTicket = createAsyncThunk(
  'tickets/create',
  async (ticketData, thunkAPI) => {
    try {
      const response = await ticketAPI.create(ticketData);
      return {
        ticket: response.data.data,
        matching: response.data.matching,
        payment: response.data.payment,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to create ticket');
    }
  }
);

export const lockTicket = createAsyncThunk(
  'tickets/lock',
  async (ticketId, thunkAPI) => {
    try {
      const response = await ticketAPI.lock(ticketId);
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to accept ticket');
    }
  }
);

export const approveHelper = createAsyncThunk(
  'tickets/approveHelper',
  async (ticketId, thunkAPI) => {
    try {
      const response = await ticketAPI.approve(ticketId);
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to approve helper');
    }
  }
);

export const rejectHelper = createAsyncThunk(
  'tickets/rejectHelper',
  async (ticketId, thunkAPI) => {
    try {
      const response = await ticketAPI.reject(ticketId);
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to reject helper');
    }
  }
);

export const cancelTicket = createAsyncThunk(
  'tickets/cancel',
  async (ticketId, thunkAPI) => {
    try {
      const response = await ticketAPI.cancel(ticketId);
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to cancel ticket');
    }
  }
);

export const resolveTicket = createAsyncThunk(
  'tickets/resolve',
  async (ticketId, thunkAPI) => {
    try {
      const response = await ticketAPI.resolve(ticketId);
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to resolve ticket');
    }
  }
);

export const refreshTicketPayment = createAsyncThunk(
  'tickets/refreshPayment',
  async (ticketId, thunkAPI) => {
    try {
      const response = await ticketAPI.refreshPayment(ticketId);
      return {
        ticket: response.data.data,
        payment: response.data.payment,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to refresh payment');
    }
  }
);

export const reviewTicket = createAsyncThunk(
  'tickets/review',
  async ({ ticketId, review }, thunkAPI) => {
    try {
      const response = await ticketAPI.review(ticketId, review);
      return response.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to submit review');
    }
  }
);

const ticketSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    addIncomingPing: (state, action) => {
      const ticket = action.payload?.ticket;
      if (!ticket?._id) return;

      state.incomingPings = upsertById(state.incomingPings, {
        ...action.payload,
        _id: ticket._id,
      });
      state.feedTickets = upsertById(state.feedTickets, ticket);
    },
    dismissIncomingPing: (state, action) => {
      state.incomingPings = removeById(state.incomingPings, action.payload);
    },
    upsertTicket: (state, action) => {
      const ticket = ticketFromPayload(action.payload);
      if (!ticket?._id) return;

      state.myTickets = upsertById(state.myTickets, ticket);

      if (ticket.status === 'searching') {
        state.feedTickets = upsertById(state.feedTickets, ticket);
      } else {
        state.feedTickets = removeById(state.feedTickets, ticket._id);
      }
    },
    setPendingReview: (state, action) => {
      state.pendingReview = action.payload;
      const ticket = action.payload?.ticket;
      if (ticket?._id) {
        state.myTickets = upsertById(state.myTickets, ticket);
        state.feedTickets = removeById(state.feedTickets, ticket._id);
      }
    },
    clearPendingReview: (state, action) => {
      if (!action.payload || getTicketId(state.pendingReview?.ticket) === getTicketId(action.payload)) {
        state.pendingReview = null;
      }
    },
    handleTicketAccepted: (state, action) => {
      const ticket = action.payload?.ticket;
      const room = action.payload?.room;
      if (!ticket?._id) return;

      state.myTickets = upsertById(state.myTickets, ticket);
      state.feedTickets = removeById(state.feedTickets, ticket._id);
      state.incomingPings = removeById(state.incomingPings, ticket._id);

      if (getTicketId(state.pendingReview?.ticket) === getTicketId(ticket)) {
        state.pendingReview = null;
      }

      if (room?._id) {
        state.roomToJoin = room;
      }
    },
    handleTicketClosed: (state, action) => {
      const ticket = ticketFromPayload(action.payload);
      if (!ticket?._id) return;

      state.myTickets = upsertById(state.myTickets, ticket);
      state.feedTickets = removeById(state.feedTickets, ticket._id);
      state.incomingPings = removeById(state.incomingPings, ticket._id);

      if (getTicketId(state.pendingReview?.ticket) === getTicketId(ticket)) {
        state.pendingReview = null;
      }
    },
    removeTicketEverywhere: (state, action) => {
      const ticketId = action.payload?.ticketId || action.payload?.ticket?._id || action.payload;
      if (!ticketId) return;

      state.myTickets = removeById(state.myTickets, ticketId);
      state.feedTickets = removeById(state.feedTickets, ticketId);
      state.incomingPings = removeById(state.incomingPings, ticketId);

      if (getTicketId(state.pendingReview?.ticket) === getTicketId(ticketId)) {
        state.pendingReview = null;
      }
    },
    clearRoomToJoin: (state) => {
      state.roomToJoin = null;
    },
    clearTicketError: (state) => {
      state.error = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getTicketFeed.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getTicketFeed.fulfilled, (state, action) => {
        state.isLoading = false;
        state.feedTickets = action.payload;
      })
      .addCase(getTicketFeed.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(getMyTickets.fulfilled, (state, action) => {
        state.myTickets = action.payload;
      })
      .addCase(createTicket.pending, (state) => {
        state.isCreating = true;
        state.error = '';
      })
      .addCase(createTicket.fulfilled, (state, action) => {
        state.isCreating = false;
        state.myTickets = upsertById(state.myTickets, action.payload.ticket);
      })
      .addCase(createTicket.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload;
      })
      .addCase(approveHelper.fulfilled, (state, action) => {
        state.actionTicketId = null;
        const ticket = action.payload?.ticket;
        const room = action.payload?.room;
        if (!ticket?._id) return;

        state.myTickets = upsertById(state.myTickets, ticket);
        state.feedTickets = removeById(state.feedTickets, ticket._id);
        state.incomingPings = removeById(state.incomingPings, ticket._id);
        state.pendingReview = null;
        if (room?._id) {
          state.roomToJoin = room;
        }
      })
      .addCase(reviewTicket.fulfilled, (state) => {
        state.actionTicketId = null;
      })
      .addMatcher(
        (action) => [
          lockTicket.pending.type,
          approveHelper.pending.type,
          rejectHelper.pending.type,
          cancelTicket.pending.type,
          resolveTicket.pending.type,
          refreshTicketPayment.pending.type,
          reviewTicket.pending.type,
        ].includes(action.type),
        (state, action) => {
          state.actionTicketId = action.meta.arg;
          state.error = '';
        }
      )
      .addMatcher(
        (action) => [
          lockTicket.fulfilled.type,
          rejectHelper.fulfilled.type,
          cancelTicket.fulfilled.type,
          resolveTicket.fulfilled.type,
          refreshTicketPayment.fulfilled.type,
        ].includes(action.type),
        (state, action) => {
          state.actionTicketId = null;
          const ticket = ticketFromPayload(action.payload);
          if (!ticket?._id) return;

          state.myTickets = upsertById(state.myTickets, ticket);
          state.incomingPings = removeById(state.incomingPings, ticket._id);

          if (ticket.status === 'searching') {
            state.feedTickets = upsertById(state.feedTickets, ticket);
          } else {
            state.feedTickets = removeById(state.feedTickets, ticket._id);
          }

          if (getTicketId(state.pendingReview?.ticket) === getTicketId(ticket)) {
            state.pendingReview = null;
          }
        }
      )
      .addMatcher(
        (action) => [
          lockTicket.rejected.type,
          approveHelper.rejected.type,
          rejectHelper.rejected.type,
          cancelTicket.rejected.type,
          resolveTicket.rejected.type,
          refreshTicketPayment.rejected.type,
          reviewTicket.rejected.type,
        ].includes(action.type),
        (state, action) => {
          state.actionTicketId = null;
          state.error = action.payload;
        }
      );
  },
});

export const {
  addIncomingPing,
  dismissIncomingPing,
  upsertTicket,
  setPendingReview,
  clearPendingReview,
  handleTicketAccepted,
  handleTicketClosed,
  removeTicketEverywhere,
  clearRoomToJoin,
  clearTicketError,
} = ticketSlice.actions;

export default ticketSlice.reducer;
