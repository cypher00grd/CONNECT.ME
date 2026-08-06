import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import Room from '../models/Room.js';
import {
  addDirectPendingTicket,
  clearHelperBusy,
  getHelpersBusyCached,
  isHelperBusyCached,
  isUserOnlineCached,
  removeDirectPendingTicket,
  setHelperBusy
} from './redisService.js';
import {
  captureTicketPayment,
  releaseTicketPayment
} from './ticketPaymentService.js';
import {
  applyEarlyExitPenalty,
  creditHelperForTicket
} from './ticketRatingService.js';
import { inferCategoryFromTags } from '../utils/categories.js';
import { expandTechTags, scoreTechMatch, getUserTechTags, normalizeTechTags } from '../data/techTaxonomy.js';

const BATCH_SIZE = 3;
const PING_TIMEOUT_MS = Number.parseInt(process.env.TICKET_PING_TIMEOUT_MS || '30000', 10);
const REVIEW_LOCK_MS = Number.parseInt(process.env.TICKET_REVIEW_LOCK_MS || '120000', 10);

const activeMatches = new Map();

const toIdString = (value) => {
  if (!value) return '';
  return (value._id || value).toString();
};

const sameId = (left, right) => toIdString(left) === toIdString(right);

const helperFields = 'username displayName avatar bio skills isInstructor rating reviewsCount reputationPoints techStack experienceLevel yearsOfExperience specialization openToMentor issuesResolved sessionsCompleted';

const getTicketMatchTags = (ticket) => normalizeTechTags([
  ...(ticket?.tags || []),
  ...(ticket?.techStack || [])
]);

const populateTicket = (query) =>
  query
    .populate('requester', 'username displayName avatar skills rating reviewsCount')
    .populate('targetHelper', helperFields)
    .populate('lockedBy', helperFields)
    .populate('acceptedBy', helperFields)
    .populate('room', 'title type status isVideoEnabled');

export const getPopulatedTicketById = (ticketId) => populateTicket(Ticket.findById(ticketId));

export const serializeUserProfile = (user) => {
  if (!user) return null;
  const source = user.toObject ? user.toObject() : user;

  if (!source.username && !source.displayName) {
    return null;
  }

  return {
    _id: source._id,
    username: source.username,
    displayName: source.displayName,
    avatar: source.avatar,
    bio: source.bio,
    skills: source.skills || [],
    isInstructor: !!source.isInstructor,
    rating: source.rating ?? 5,
    reviewsCount: source.reviewsCount ?? 0,
    reputationPoints: source.reputationPoints ?? 0
  };
};

export const serializeTicket = (ticket) => {
  if (!ticket) return null;
  const source = ticket.toObject ? ticket.toObject() : ticket;

  return {
    _id: source._id,
    requester: serializeUserProfile(source.requester) || source.requester,
    title: source.title,
    description: source.description,
    tags: source.tags || [],
    screenshots: source.screenshots || [],
    sessionType: source.sessionType || 'debugging',
    techStack: source.techStack || [],
    difficulty: source.difficulty || 'intermediate',
    repoUrl: source.repoUrl || '',
    errorContext: source.errorContext || '',
    visibility: source.visibility || 'public',
    targetHelper: serializeUserProfile(source.targetHelper) || source.targetHelper || null,
    estimatedMinutes: source.estimatedMinutes || 30,
    bountyAmount: source.bountyAmount || 0,
    paymentStatus: source.paymentStatus,
    status: source.status,
    lockedBy: serializeUserProfile(source.lockedBy) || source.lockedBy,
    acceptedBy: serializeUserProfile(source.acceptedBy) || source.acceptedBy,
    rejectedHelpers: source.rejectedHelpers || [],
    room: source.room || null,
    lockExpiresAt: source.lockExpiresAt || null,
    sessionStartedAt: source.sessionStartedAt || null,
    sessionEndedAt: source.sessionEndedAt || null,
    minimumMetAt: source.minimumMetAt || null,
    actualDurationSeconds: source.actualDurationSeconds || 0,
    endedBy: source.endedBy || null,
    exitReason: source.exitReason || '',
    resolvedAt: source.resolvedAt || null,
    cancelledAt: source.cancelledAt || null,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt
  };
};

const clearMatchTimer = (ticketId) => {
  const key = toIdString(ticketId);
  const state = activeMatches.get(key);

  if (state?.timeout) {
    clearTimeout(state.timeout);
  }

  activeMatches.delete(key);
};

const getRequesterRoom = (ticket) => toIdString(ticket.requester);

const findMatchingHelpers = async (ticket) => {
  const excludedIds = [
    ticket.requester,
    ticket.lockedBy,
    ticket.acceptedBy,
    ...(ticket.rejectedHelpers || [])
  ]
    .map(toIdString)
    .filter(Boolean);

  const matchTags = getTicketMatchTags(ticket);
  const expanded = expandTechTags(matchTags);
  const candidateTags = expanded.all.length > 0 ? expanded.all : matchTags;

  const helpers = await User.find({
    _id: { $nin: excludedIds },
    isOnline: true,
    $and: [
      { $or: [{ isInstructor: true }, { openToMentor: true }] },
      {
        $or: [
          { skills: { $in: candidateTags } },
          { 'techStack.languages': { $in: candidateTags } },
          { 'techStack.frameworks': { $in: candidateTags } },
          { 'techStack.tools': { $in: candidateTags } },
          { specialization: { $in: [...expanded.domains, ...expanded.direct] } }
        ]
      }
    ]
  })
    .select(helperFields)
    .sort({ rating: -1, reviewsCount: -1, reputationPoints: -1, updatedAt: -1 })
    .limit(30)
    .lean();

  const availableHelpers = await filterAvailableHelpers(helpers);
  return availableHelpers
    .map((helper) => ({
      ...helper,
      matchScore: scoreTechMatch(matchTags, helper)
    }))
    .sort((left, right) => right.matchScore - left.matchScore);
};

const emitNoHelpers = (io, ticket) => {
  const requesterRoom = getRequesterRoom(ticket);
  if (!requesterRoom) return;

  io.to(requesterRoom).emit('ticket_no_helpers_available', {
    ticketId: ticket._id,
    message: 'No matching online helpers are available right now.'
  });
};

const getActiveHelperTicket = async (helperId) => Ticket.findOne({
  status: { $in: ['locked', 'accepted', 'in_progress'] },
  $or: [
    { lockedBy: helperId },
    { acceptedBy: helperId }
  ]
}).select('_id status').lean();

export const isHelperBusy = async (helperId) => {
  const cached = await isHelperBusyCached(helperId);
  if (cached !== null) return cached > 0;

  return !!(await getActiveHelperTicket(helperId));
};

const setBusyForTicket = async (helperId, ticketId) => {
  if (helperId) {
    await setHelperBusy(toIdString(helperId), toIdString(ticketId));
  }
};

const clearBusyForTicket = async (helperId) => {
  if (helperId) {
    await clearHelperBusy(toIdString(helperId));
  }
};

const filterAvailableHelpers = async (helpers) => {
  const helperIds = helpers.map((helper) => toIdString(helper._id));
  const cachedBusy = await getHelpersBusyCached(helperIds);

  if (cachedBusy !== null) {
    return helpers.filter((helper) => !cachedBusy.get(toIdString(helper._id)));
  }

  const activeTickets = await Ticket.find({
    status: { $in: ['locked', 'accepted', 'in_progress'] },
    $or: [
      { lockedBy: { $in: helperIds } },
      { acceptedBy: { $in: helperIds } }
    ]
  }).select('lockedBy acceptedBy').lean();
  const busyIds = new Set(activeTickets.flatMap((ticket) => (
    [toIdString(ticket.lockedBy), toIdString(ticket.acceptedBy)].filter(Boolean)
  )));
  return helpers.filter((helper) => !busyIds.has(toIdString(helper._id)));
};

export const notifyNextTicketBatch = async (io, ticketId) => {
  const key = toIdString(ticketId);
  const ticket = await getPopulatedTicketById(key);

  if (!ticket || ticket.status !== 'searching') {
    clearMatchTimer(key);
    return null;
  }

  if (ticket.bountyAmount > 0 && !['authorized', 'captured'].includes(ticket.paymentStatus)) {
    clearMatchTimer(key);
    return null;
  }

  let state = activeMatches.get(key);

  if (!state) {
    const helpers = await findMatchingHelpers(ticket);
    state = {
      helperIds: helpers.map((helper) => toIdString(helper._id)),
      cursor: 0,
      timeout: null
    };
    activeMatches.set(key, state);
  }

  if (state.timeout) {
    clearTimeout(state.timeout);
    state.timeout = null;
  }

  const batchIds = state.helperIds.slice(state.cursor, state.cursor + BATCH_SIZE);
  state.cursor += BATCH_SIZE;

  if (batchIds.length === 0) {
    clearMatchTimer(key);
    emitNoHelpers(io, ticket);
    return [];
  }

  const helpers = await User.find({ _id: { $in: batchIds } })
    .select(helperFields)
    .lean();
  const ticketPayload = serializeTicket(ticket);
  const batchExpiresAt = new Date(Date.now() + PING_TIMEOUT_MS);

  helpers.forEach((helper) => {
    io.to(toIdString(helper._id)).emit('ticket_ping', {
      ticket: ticketPayload,
      helper: serializeUserProfile(helper),
      batchExpiresAt
    });
  });

  io.to(getRequesterRoom(ticket)).emit('ticket_matching_batch_sent', {
    ticketId: ticket._id,
    batchNumber: Math.ceil(state.cursor / BATCH_SIZE),
    helpers: helpers.map(serializeUserProfile),
    batchExpiresAt
  });

  state.timeout = setTimeout(async () => {
    try {
      const latestTicket = await Ticket.findById(key).select('status');

      if (latestTicket?.status === 'searching') {
        await User.updateMany(
          { _id: { $in: batchIds } },
          { $inc: { ignoredTicketPings: 1 } }
        );
        await notifyNextTicketBatch(io, key);
      } else {
        clearMatchTimer(key);
      }
    } catch (error) {
      console.error('Ticket batch timeout error:', error);
      clearMatchTimer(key);
    }
  }, PING_TIMEOUT_MS);

  return helpers;
};

export const startTicketMatching = async (io, ticketId) => {
  if (!io) return [];

  clearMatchTimer(ticketId);
  return notifyNextTicketBatch(io, ticketId);
};

export const dispatchDirectTicket = async (io, ticketId) => {
  const ticket = await getPopulatedTicketById(ticketId);
  if (!ticket || ticket.visibility !== 'direct' || ticket.status !== 'direct_pending' || !ticket.targetHelper) return null;
  if (ticket.bountyAmount > 0 && !['authorized', 'captured'].includes(ticket.paymentStatus)) return null;

  const helperId = toIdString(ticket.targetHelper);
  const payload = serializeTicket(ticket);
  const isOnline = await isUserOnlineCached(helperId);
  const helperBusy = await isHelperBusy(helperId);

  await addDirectPendingTicket(helperId, ticket._id);

  if (isOnline === false || helperBusy) {
    io?.to(getRequesterRoom(ticket)).emit('ticket_direct_waiting', {
      ticket: payload,
      message: helperBusy
        ? 'This helper is currently busy with another ticket.'
        : 'This helper is offline. They will see the request when available.'
    });
    return null;
  }

  io?.to(helperId).emit('ticket_ping', {
    ticket: payload,
    helper: serializeUserProfile(ticket.targetHelper),
    direct: true,
    batchExpiresAt: null
  });

  return ticket.targetHelper;
};

export const activateTicketAfterPayment = async (io, ticketId) => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket || ticket.status !== 'payment_pending') return null;
  if (ticket.bountyAmount > 0 && !['authorized', 'captured'].includes(ticket.paymentStatus)) return null;

  ticket.status = ticket.visibility === 'direct' ? 'direct_pending' : 'searching';
  ticket.paymentAuthorizedAt = ticket.paymentAuthorizedAt || new Date();
  await ticket.save();

  const populatedTicket = await getPopulatedTicketById(ticket._id);
  const payload = serializeTicket(populatedTicket);

  io?.to(getRequesterRoom(populatedTicket)).emit('ticket_payment_authorized', {
    ticket: payload
  });

  if (populatedTicket.visibility === 'direct') {
    await dispatchDirectTicket(io, populatedTicket._id);
  } else {
    await startTicketMatching(io, populatedTicket._id);
  }

  return populatedTicket;
};

export const lockTicketForHelper = async (io, ticketId, helperId) => {
  const helper = await User.findById(helperId)
    .select('skills isInstructor openToMentor techStack specialization rating reviewsCount reputationPoints experienceLevel')
    .lean();
  const helperSkills = getUserTechTags(helper || {});

  if (!helper?.isInstructor && !helper?.openToMentor) {
    return {
      ticket: null,
      message: 'Turn on helper availability in your profile before accepting tickets'
    };
  }

  if (helperSkills.length === 0) {
    return {
      ticket: null,
      message: 'Add matching skills to your profile before accepting tickets'
    };
  }

  if (await isHelperBusy(helperId)) {
    return {
      ticket: null,
      message: 'You are already engaged with another ticket'
    };
  }

  const lockExpiresAt = new Date(Date.now() + REVIEW_LOCK_MS);
  const ticket = await Ticket.findById(ticketId).select('visibility targetHelper tags techStack status paymentStatus bountyAmount requester rejectedHelpers').lean();

  if (!ticket || !['searching', 'direct_pending'].includes(ticket.status)) {
    return {
      ticket: null,
      message: 'Ticket is no longer available'
    };
  }

  if (ticket.bountyAmount > 0 && !['authorized', 'captured'].includes(ticket.paymentStatus)) {
    return {
      ticket: null,
      message: 'Payment authorization is required before accepting this ticket'
    };
  }

  const isDirectTicket = ticket.visibility === 'direct';
  const isTargetHelper = isDirectTicket && sameId(ticket.targetHelper, helperId);
  const expandedTicketTags = expandTechTags(getTicketMatchTags(ticket));
  const candidateTags = new Set(expandedTicketTags.all);
  const hasMatchingSkill = helperSkills.some((tag) => candidateTags.has(tag));

  if (isDirectTicket && !isTargetHelper) {
    return {
      ticket: null,
      message: 'This direct ticket is assigned to another helper'
    };
  }

  if (!isDirectTicket && !hasMatchingSkill) {
    return {
      ticket: null,
      message: 'This ticket does not match your skills'
    };
  }

  const lockedTicket = await populateTicket(
    Ticket.findOneAndUpdate(
      {
        _id: ticketId,
        status: { $in: ['searching', 'direct_pending'] },
        ...(ticket.bountyAmount > 0 ? { paymentStatus: { $in: ['authorized', 'captured'] } } : {}),
        requester: { $ne: helperId },
        rejectedHelpers: { $ne: helperId },
        ...(isDirectTicket ? { targetHelper: helperId } : {})
      },
      {
        $set: {
          status: 'locked',
          lockedBy: helperId,
          lockExpiresAt
        }
      },
      { new: true, runValidators: true }
    )
  );

  if (!lockedTicket) {
    return {
      ticket: null,
      message: 'Ticket is no longer available'
    };
  }

  await setBusyForTicket(helperId, lockedTicket._id);
  await removeDirectPendingTicket(helperId, lockedTicket._id);
  clearMatchTimer(lockedTicket._id);

  const payload = serializeTicket(lockedTicket);
  const helperProfile = serializeUserProfile(lockedTicket.lockedBy);

  io.to(getRequesterRoom(lockedTicket)).emit('ticket_helper_locked', {
    ticket: payload,
    helper: helperProfile,
    lockExpiresAt
  });

  io.to(toIdString(helperId)).emit('ticket_locked', {
    ticket: payload,
    lockExpiresAt
  });

  return { ticket: lockedTicket, message: null };
};

export const approveLockedHelper = async (io, ticketId, requesterId) => {
  const ticket = await Ticket.findOne({
    _id: ticketId,
    requester: requesterId,
    status: 'locked',
    lockedBy: { $ne: null }
  });

  if (!ticket) {
    return {
      ticket: null,
      room: null,
      message: 'No locked helper is waiting for approval'
    };
  }

  if (ticket.bountyAmount > 0 && !['authorized', 'captured'].includes(ticket.paymentStatus)) {
    return {
      ticket: null,
      room: null,
      message: 'Payment authorization is required before starting this ticket'
    };
  }

  const helperId = ticket.lockedBy;
  const matchTags = getTicketMatchTags(ticket);
  const category = inferCategoryFromTags(matchTags);
  const room = await Room.create({
    title: `Help: ${ticket.title}`,
    description: ticket.description,
    category,
    techTags: ticket.techStack?.length ? ticket.techStack : ticket.tags,
    sessionType: ticket.sessionType || 'debugging',
    difficulty: ticket.difficulty || 'intermediate',
    repositoryUrl: ticket.repoUrl || '',
    creator: requesterId,
    type: 'vod_session',
    status: 'active',
    isVideoEnabled: true,
    maxParticipants: 2,
    participants: [{ user: requesterId }, { user: helperId }],
    ticket: ticket._id
  });

  ticket.status = 'in_progress';
  ticket.acceptedBy = helperId;
  ticket.room = room._id;
  ticket.lockExpiresAt = null;
  await ticket.save();
  await setBusyForTicket(helperId, ticket._id);

  const populatedTicket = await getPopulatedTicketById(ticket._id);
  const populatedRoom = await Room.findById(room._id)
    .populate('creator', 'username displayName avatar')
    .populate('participants.user', 'username displayName avatar')
    .populate('ticket', 'title status estimatedMinutes bountyAmount paymentStatus sessionStartedAt minimumMetAt actualDurationSeconds requester acceptedBy');

  const ticketPayload = serializeTicket(populatedTicket);
  const roomPayload = populatedRoom.toObject();

  io.to(toIdString(requesterId)).emit('ticket_accepted', {
    ticket: ticketPayload,
    room: roomPayload,
    helper: serializeUserProfile(populatedTicket.acceptedBy)
  });

  io.to(toIdString(helperId)).emit('ticket_accepted', {
    ticket: ticketPayload,
    room: roomPayload,
    requester: serializeUserProfile(populatedTicket.requester)
  });

  return {
    ticket: populatedTicket,
    room: populatedRoom,
    message: null
  };
};

export const rejectLockedHelper = async (io, ticketId, requesterId) => {
  const ticket = await Ticket.findOne({
    _id: ticketId,
    requester: requesterId,
    status: 'locked',
    lockedBy: { $ne: null }
  });

  if (!ticket) {
    return {
      ticket: null,
      rejectedHelperId: null,
      message: 'No locked helper is waiting for review'
    };
  }

  const rejectedHelperId = ticket.lockedBy;
  ticket.rejectedHelpers.addToSet(rejectedHelperId);
  const isDirectTicket = ticket.visibility === 'direct';
  ticket.status = isDirectTicket ? 'cancelled' : 'searching';
  ticket.lockedBy = null;
  ticket.lockExpiresAt = null;
  if (isDirectTicket) {
    ticket.cancelledAt = new Date();
    ticket.exitReason = 'cancelled';
  }
  await ticket.save();
  await clearBusyForTicket(rejectedHelperId);

  if (isDirectTicket && ['authorization_required', 'authorized', 'captured'].includes(ticket.paymentStatus)) {
    const release = await releaseTicketPayment(ticket);
    ticket.paymentStatus = release?.status || 'released';
    ticket.paymentReleasedAt = release?.status === 'released' ? new Date() : ticket.paymentReleasedAt;
    ticket.paymentRefundedAt = release?.status === 'refunded' ? new Date() : ticket.paymentRefundedAt;
    ticket.stripeRefundId = release?.refund?.id || ticket.stripeRefundId;
    await ticket.save();
  }

  const populatedTicket = await getPopulatedTicketById(ticket._id);
  const payload = serializeTicket(populatedTicket);

  io.to(toIdString(rejectedHelperId)).emit('ticket_rejected', {
    ticketId: ticket._id,
    ticket: payload,
    remove: true
  });

  if (isDirectTicket) {
    io.to(toIdString(requesterId)).emit('ticket_cancelled', { ticket: payload });
  } else {
    io.to(toIdString(requesterId)).emit('ticket_search_resumed', {
      ticket: payload
    });
    await startTicketMatching(io, ticket._id);
  }

  return {
    ticket: populatedTicket,
    rejectedHelperId,
    message: null
  };
};

export const cancelTicket = async (io, ticketId, requesterId) => {
  const ticket = await Ticket.findOne({
    _id: ticketId,
    requester: requesterId,
    status: { $nin: ['resolved', 'cancelled'] }
  });

  if (!ticket) {
    return {
      ticket: null,
      message: 'Ticket cannot be cancelled'
    };
  }

  const notifyIds = [ticket.lockedBy, ticket.acceptedBy].map(toIdString).filter(Boolean);
  const busyHelperId = ticket.acceptedBy || ticket.lockedBy;
  ticket.status = 'cancelled';
  ticket.cancelledAt = new Date();
  ticket.exitReason = 'cancelled';
  ticket.lockedBy = null;
  ticket.lockExpiresAt = null;
  await ticket.save();
  await clearBusyForTicket(busyHelperId);

  if (['authorization_required', 'authorized', 'captured'].includes(ticket.paymentStatus)) {
    const release = await releaseTicketPayment(ticket);
    ticket.paymentStatus = release?.status || 'released';
    ticket.paymentReleasedAt = release?.status === 'released' ? new Date() : ticket.paymentReleasedAt;
    ticket.paymentRefundedAt = release?.status === 'refunded' ? new Date() : ticket.paymentRefundedAt;
    ticket.stripeRefundId = release?.refund?.id || ticket.stripeRefundId;
    await ticket.save();
  }

  if (ticket.room) {
    await Room.findByIdAndUpdate(ticket.room, {
      status: 'ended',
      endedAt: new Date()
    });
  }

  clearMatchTimer(ticket._id);

  const populatedTicket = await getPopulatedTicketById(ticket._id);
  const payload = serializeTicket(populatedTicket);

  [toIdString(requesterId), ...notifyIds].forEach((userId) => {
    io.to(userId).emit('ticket_cancelled', { ticket: payload });
  });

  return { ticket: populatedTicket, message: null };
};

export const resolveTicket = async (io, ticketId, requesterId) => {
  const ticket = await Ticket.findOne({
    _id: ticketId,
    requester: requesterId,
    status: { $in: ['accepted', 'in_progress'] }
  });

  if (!ticket) {
    return {
      ticket: null,
      message: 'Ticket is not ready to resolve'
    };
  }

  const now = new Date();
  if (ticket.sessionStartedAt && !ticket.sessionEndedAt) {
    ticket.actualDurationSeconds = Math.max(0, Math.floor((now - ticket.sessionStartedAt) / 1000));
  }
  ticket.status = 'resolved';
  ticket.resolvedAt = now;
  ticket.sessionEndedAt = ticket.sessionEndedAt || now;
  ticket.minimumMetAt = ticket.minimumMetAt || now;
  ticket.exitReason = 'resolved';

  if (ticket.paymentStatus === 'authorized') {
    await captureTicketPayment(ticket);
    ticket.paymentStatus = 'captured';
    ticket.paymentCapturedAt = now;
    await creditHelperForTicket(ticket.acceptedBy, ticket.bountyAmount);
  } else if (ticket.bountyAmount <= 0) {
    await creditHelperForTicket(ticket.acceptedBy, 0);
  }

  await ticket.save();
  await clearBusyForTicket(ticket.acceptedBy);

  if (ticket.room) {
    await Room.findByIdAndUpdate(ticket.room, {
      status: 'ended',
      endedAt: new Date()
    });
    io.to(toIdString(ticket.room)).emit('room_ended', {
      roomId: ticket.room,
      message: 'The on-demand help session has been resolved'
    });
  }

  const populatedTicket = await getPopulatedTicketById(ticket._id);
  const payload = serializeTicket(populatedTicket);

  [ticket.requester, ticket.acceptedBy].map(toIdString).filter(Boolean).forEach((userId) => {
    io.to(userId).emit('ticket_resolved', { ticket: payload });
  });

  return { ticket: populatedTicket, message: null };
};

export const markTicketSessionStarted = async (io, roomId) => {
  const room = await Room.findById(roomId).select('ticket type participants');
  if (!room || room.type !== 'vod_session' || !room.ticket) return null;

  const ticket = await Ticket.findById(room.ticket);
  if (!ticket || ticket.status !== 'in_progress' || ticket.sessionStartedAt) return ticket;

  ticket.sessionStartedAt = new Date();
  await ticket.save();

  const populatedTicket = await getPopulatedTicketById(ticket._id);
  io?.to(toIdString(roomId)).emit('ticket_session_started', {
    ticket: serializeTicket(populatedTicket)
  });

  return populatedTicket;
};

export const endTicketSessionEarly = async (io, roomId, endedByUserId) => {
  const room = await Room.findById(roomId).select('ticket type status');
  if (!room || room.type !== 'vod_session' || !room.ticket) return null;

  const ticket = await Ticket.findById(room.ticket);
  if (!ticket || ticket.status !== 'in_progress') return null;

  const now = new Date();
  const helperId = ticket.acceptedBy;
  const requesterEnded = sameId(ticket.requester, endedByUserId);
  const helperEnded = sameId(helperId, endedByUserId);

  if (!requesterEnded && !helperEnded) return null;

  const elapsedSeconds = ticket.sessionStartedAt
    ? Math.max(0, Math.floor((now - ticket.sessionStartedAt) / 1000))
    : 0;
  const minimumSeconds = Number(ticket.estimatedMinutes || 30) * 60;

  if (elapsedSeconds >= minimumSeconds) {
    ticket.minimumMetAt = ticket.minimumMetAt || now;
    ticket.actualDurationSeconds = elapsedSeconds;
    await ticket.save();
    return ticket;
  }

  ticket.status = 'cancelled';
  ticket.sessionEndedAt = now;
  ticket.cancelledAt = now;
  ticket.actualDurationSeconds = elapsedSeconds;
  ticket.endedBy = endedByUserId;
  ticket.exitReason = requesterEnded ? 'requester_early_exit' : 'helper_early_exit';
  await ticket.save();

  if (['authorization_required', 'authorized', 'captured'].includes(ticket.paymentStatus)) {
    const release = await releaseTicketPayment(ticket);
    ticket.paymentStatus = release?.status || 'released';
    ticket.paymentReleasedAt = release?.status === 'released' ? now : ticket.paymentReleasedAt;
    ticket.paymentRefundedAt = release?.status === 'refunded' ? now : ticket.paymentRefundedAt;
    ticket.stripeRefundId = release?.refund?.id || ticket.stripeRefundId;
    await ticket.save();
  }

  await applyEarlyExitPenalty(endedByUserId, requesterEnded ? 'requester' : 'helper');
  await clearBusyForTicket(helperId);

  await Room.findByIdAndUpdate(roomId, {
    status: 'ended',
    endedAt: now
  });

  const populatedTicket = await getPopulatedTicketById(ticket._id);
  const payload = serializeTicket(populatedTicket);

  [ticket.requester, helperId].map(toIdString).filter(Boolean).forEach((userId) => {
    io?.to(userId).emit('ticket_cancelled', { ticket: payload });
  });
  io?.to(toIdString(roomId)).emit('room_ended', {
    roomId,
    message: 'The on-demand session ended before the minimum time'
  });

  return populatedTicket;
};

export const userCanViewTicket = (ticket, user) => {
  const userId = toIdString(user?._id || user);

  if (!ticket || !userId) return false;
  if (sameId(ticket.requester, userId)) return true;

  const paymentVisible = Number(ticket.bountyAmount || 0) <= 0
    || ['authorized', 'captured'].includes(ticket.paymentStatus);
  if (!paymentVisible) return false;

  if (sameId(ticket.targetHelper, userId)) return true;
  if (sameId(ticket.lockedBy, userId)) return true;
  if (sameId(ticket.acceptedBy, userId)) return true;

  const userTags = new Set(getUserTechTags(user || {}));
  const ticketTags = expandTechTags(getTicketMatchTags(ticket)).all;

  return ticket.status === 'searching'
    && ticket.visibility !== 'direct'
    && ticketTags.some((tag) => userTags.has(tag))
    && !(ticket.rejectedHelpers || []).some((helperId) => sameId(helperId, userId));
};
