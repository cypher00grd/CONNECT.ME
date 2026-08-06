import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import TicketReview from '../models/TicketReview.js';
import {
  activateTicketAfterPayment,
  approveLockedHelper,
  cancelTicket,
  dispatchDirectTicket,
  getPopulatedTicketById,
  lockTicketForHelper,
  rejectLockedHelper,
  resolveTicket,
  serializeTicket,
  startTicketMatching,
  userCanViewTicket
} from '../services/ticketMatchingService.js';
import {
  createTicketCheckoutSession,
  syncTicketPaymentAuthorization
} from '../services/ticketPaymentService.js';
import { applyUserReview } from '../services/ticketRatingService.js';
import { getUserTechTags } from '../data/techTaxonomy.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const SESSION_TYPES = new Set([
  'debugging',
  'code_review',
  'pair_programming',
  'architecture_review',
  'mentoring',
  'mock_interview',
  'deployment_help',
  'other'
]);
const DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced']);

const normalizeTags = (tags, limit = 5) => {
  if (!Array.isArray(tags)) return [];

  return [
    ...new Set(
      tags
        .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
        .filter(Boolean)
    )
  ].slice(0, limit);
};

const normalizeSessionType = (value) => (
  typeof value === 'string' && SESSION_TYPES.has(value.trim())
    ? value.trim()
    : 'debugging'
);

const normalizeDifficulty = (value) => (
  typeof value === 'string' && DIFFICULTIES.has(value.trim())
    ? value.trim()
    : 'intermediate'
);

const normalizeUrl = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:'].includes(parsed.protocol) ? trimmed : '';
  } catch {
    return '';
  }
};

const normalizeScreenshots = (screenshots) => {
  if (!Array.isArray(screenshots)) return [];

  return screenshots
    .map((screenshot) => ({
      url: typeof screenshot?.url === 'string' ? screenshot.url.trim() : '',
      name: typeof screenshot?.name === 'string' ? screenshot.name.trim() : '',
      size: Number.isFinite(Number(screenshot?.size)) ? Number(screenshot.size) : 0
    }))
    .filter((screenshot) => screenshot.url)
    .slice(0, 5);
};

const parseBountyAmount = (value) => {
  if (value === undefined || value === null || value === '') return 0;

  const amount = Number(value);
  return Number.isFinite(amount) ? amount : Number.NaN;
};

const parseEstimatedMinutes = (value) => {
  const minutes = Number(value || 30);
  return [30, 60, 90, 120].includes(minutes) ? minutes : 30;
};

const parseBoolean = (value) => value === true || value === 'true';

// @desc    Create an on-demand help ticket
// @route   POST /api/tickets
// @access  Private
export const createTicket = async (req, res, next) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    const tags = normalizeTags(req.body.tags);
    const screenshots = normalizeScreenshots(req.body.screenshots);
    const sessionType = normalizeSessionType(req.body.sessionType);
    const techStack = normalizeTags(req.body.techStack, 8);
    const difficulty = normalizeDifficulty(req.body.difficulty);
    const repoUrl = normalizeUrl(req.body.repoUrl);
    const errorContext = typeof req.body.errorContext === 'string' ? req.body.errorContext.trim() : '';
    const bountyAmount = parseBountyAmount(req.body.bountyAmount);
    const estimatedMinutes = parseEstimatedMinutes(req.body.estimatedMinutes);
    const targetHelper = req.body.targetHelper || req.body.targetHelperId || null;

    if (!title || !description || tags.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and at least one tag are required'
      });
    }

    if (!Number.isFinite(bountyAmount) || bountyAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Bounty amount must be a valid non-negative number'
      });
    }

    let helper = null;
    if (targetHelper) {
      if (!isValidObjectId(targetHelper)) {
        return res.status(400).json({ success: false, message: 'Invalid target helper id' });
      }

      helper = await User.findById(targetHelper).select('username displayName isInstructor skills').lean();
      if (!helper || !helper.isInstructor) {
        return res.status(400).json({ success: false, message: 'Direct tickets can only target available helpers' });
      }

      if (helper._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ success: false, message: 'You cannot raise a ticket to yourself' });
      }
    }

    const ticket = await Ticket.create({
      requester: req.user._id,
      title,
      description,
      tags,
      screenshots,
      sessionType,
      techStack,
      difficulty,
      repoUrl,
      errorContext,
      bountyAmount,
      estimatedMinutes,
      visibility: helper ? 'direct' : 'public',
      targetHelper: helper?._id || null,
      status: bountyAmount > 0
        ? 'payment_pending'
        : helper
          ? 'direct_pending'
          : 'searching'
    });

    const populatedTicket = await getPopulatedTicketById(ticket._id);
    const io = req.app.get('io');

    if (bountyAmount > 0) {
      const checkoutSession = await createTicketCheckoutSession({
        ticket,
        requester: req.user
      });

      ticket.stripeCheckoutSessionId = checkoutSession.id;
      await ticket.save();

      return res.status(201).json({
        success: true,
        data: serializeTicket(await getPopulatedTicketById(ticket._id)),
        payment: {
          required: true,
          url: checkoutSession.url,
          sessionId: checkoutSession.id
        },
        matching: {
          pingedHelpers: 0
        }
      });
    }

    const matchedHelpers = helper
      ? [await dispatchDirectTicket(io, ticket._id)].filter(Boolean)
      : await startTicketMatching(io, ticket._id);

    res.status(201).json({
      success: true,
      data: serializeTicket(populatedTicket),
      matching: {
        pingedHelpers: matchedHelpers?.length || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get matching open tickets for the current user's skills
// @route   GET /api/tickets/feed
// @access  Private
export const getTicketFeed = async (req, res, next) => {
  try {
    const skills = getUserTechTags(req.user || {});

    if (!req.user.isInstructor) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const tickets = await Ticket.find({
      requester: { $ne: req.user._id },
      rejectedHelpers: { $ne: req.user._id },
      $or: [
        ...(skills.length > 0
          ? [{
            visibility: 'public',
            status: 'searching',
            paymentStatus: { $in: ['not_required', 'authorized', 'captured'] },
            $or: [
              { tags: { $in: skills } },
              { techStack: { $in: skills } }
            ]
          }]
          : []),
        {
          visibility: 'direct',
          status: 'direct_pending',
          paymentStatus: { $in: ['not_required', 'authorized', 'captured'] },
          targetHelper: req.user._id
        }
      ]
    })
      .populate('requester', 'username displayName avatar skills rating reviewsCount')
      .populate('targetHelper', 'username displayName avatar bio skills isInstructor rating reviewsCount reputationPoints')
      .sort({ bountyAmount: -1, createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: tickets.map(serializeTicket)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tickets related to the current user
// @route   GET /api/tickets/my
// @access  Private
export const getMyTickets = async (req, res, next) => {
  try {
    const tickets = await Ticket.find({
      $or: [
        { requester: req.user._id },
        { targetHelper: req.user._id },
        { lockedBy: req.user._id },
        { acceptedBy: req.user._id }
      ]
    })
      .populate('requester', 'username displayName avatar skills rating reviewsCount')
      .populate('targetHelper', 'username displayName avatar bio skills isInstructor rating reviewsCount reputationPoints')
      .populate('lockedBy', 'username displayName avatar bio skills isInstructor rating reviewsCount reputationPoints')
      .populate('acceptedBy', 'username displayName avatar bio skills isInstructor rating reviewsCount reputationPoints')
      .populate('room', 'title type status isVideoEnabled')
      .sort({ updatedAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      data: tickets.map(serializeTicket)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Rate the other ticket participant
// @route   POST /api/tickets/:id/review
// @access  Private
export const reviewTicket = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket id' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket || ticket.status !== 'resolved') {
      return res.status(400).json({ success: false, message: 'Only resolved tickets can be reviewed' });
    }

    const isRequester = ticket.requester.toString() === req.user._id.toString();
    const isHelper = ticket.acceptedBy?.toString() === req.user._id.toString();

    if (!isRequester && !isHelper) {
      return res.status(403).json({ success: false, message: 'You cannot review this ticket' });
    }

    const stars = Number(req.body.stars);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ success: false, message: 'Stars must be between 1 and 5' });
    }

    const reviewee = isRequester ? ticket.acceptedBy : ticket.requester;
    if (!reviewee) {
      return res.status(400).json({ success: false, message: 'No participant available to review' });
    }

    const review = await TicketReview.create({
      ticket: ticket._id,
      reviewer: req.user._id,
      reviewee,
      role: isRequester ? 'requester_to_helper' : 'helper_to_requester',
      stars,
      issueFixed: parseBoolean(req.body.issueFixed),
      conceptUnderstood: parseBoolean(req.body.conceptUnderstood),
      comment: typeof req.body.comment === 'string' ? req.body.comment.trim() : ''
    });

    const reputationDelta = isRequester
      ? (review.issueFixed ? 10 : -5) + (review.conceptUnderstood ? 5 : 0)
      : 0;
    await applyUserReview(reviewee, stars, reputationDelta);

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'You already reviewed this ticket' });
    }
    next(error);
  }
};

export const activatePaidTicketForWebhook = activateTicketAfterPayment;

// @desc    Sync a paid ticket after Stripe checkout redirect/webhook lag
// @route   POST /api/tickets/:id/refresh-payment
// @access  Private
export const refreshTicketPayment = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket id' });
    }

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      requester: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (ticket.bountyAmount <= 0) {
      return res.status(400).json({ success: false, message: 'This ticket does not require payment' });
    }

    let sync = ticket.stripeCheckoutSessionId
      ? await syncTicketPaymentAuthorization(ticket)
      : {
        authorized: false,
        sessionStatus: null,
        paymentIntentStatus: null,
        sessionUrl: null
      };
    let populatedTicket = null;

    if (sync.authorized && ticket.status === 'payment_pending') {
      populatedTicket = await activateTicketAfterPayment(req.app.get('io'), ticket._id);
    }

    populatedTicket = populatedTicket || await getPopulatedTicketById(ticket._id);

    if (!sync.authorized && populatedTicket.status === 'payment_pending') {
      let checkoutUrl = sync.sessionStatus === 'open' ? sync.sessionUrl : null;

      if (!checkoutUrl && (!ticket.stripeCheckoutSessionId || sync.sessionStatus === 'expired')) {
        const previousSessionId = ticket.stripeCheckoutSessionId || 'missing';
        const checkoutSession = await createTicketCheckoutSession({
          ticket,
          requester: req.user,
          checkoutAttempt: previousSessionId
        });
        ticket.stripeCheckoutSessionId = checkoutSession.id;
        ticket.paymentStatus = 'authorization_required';
        await ticket.save();
        checkoutUrl = checkoutSession.url;
        sync = {
          ...sync,
          sessionStatus: checkoutSession.status || 'open',
          sessionUrl: checkoutSession.url
        };
        populatedTicket = await getPopulatedTicketById(ticket._id);
      }

      if (checkoutUrl) {
        return res.status(200).json({
          success: true,
          data: serializeTicket(populatedTicket),
          payment: {
            authorized: false,
            required: true,
            url: checkoutUrl,
            sessionStatus: sync.sessionStatus,
            paymentIntentStatus: sync.paymentIntentStatus
          }
        });
      }

      return res.status(409).json({
        success: false,
        message: 'Stripe is still processing this authorization. Please try again shortly.',
        payment: {
          sessionStatus: sync.sessionStatus,
          paymentIntentStatus: sync.paymentIntentStatus
        },
        data: serializeTicket(populatedTicket)
      });
    }

    res.status(200).json({
      success: true,
      data: serializeTicket(populatedTicket),
      payment: {
        authorized: sync.authorized || populatedTicket.paymentStatus === 'authorized',
        sessionStatus: sync.sessionStatus,
        paymentIntentStatus: sync.paymentIntentStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single ticket
// @route   GET /api/tickets/:id
// @access  Private
export const getTicket = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket id' });
    }

    const ticket = await getPopulatedTicketById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (!userCanViewTicket(ticket, req.user)) {
      return res.status(403).json({ success: false, message: 'You do not have access to this ticket' });
    }

    res.status(200).json({
      success: true,
      data: serializeTicket(ticket)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Helper locks a searching ticket for requester review
// @route   POST /api/tickets/:id/lock
// @access  Private
export const lockTicket = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket id' });
    }

    const { ticket, message } = await lockTicketForHelper(
      req.app.get('io'),
      req.params.id,
      req.user._id
    );

    if (!ticket) {
      return res.status(409).json({ success: false, message });
    }

    res.status(200).json({
      success: true,
      data: serializeTicket(ticket)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Requester approves the locked helper and starts the VOD room
// @route   POST /api/tickets/:id/approve
// @access  Private
export const approveHelper = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket id' });
    }

    const { ticket, room, message } = await approveLockedHelper(
      req.app.get('io'),
      req.params.id,
      req.user._id
    );

    if (!ticket) {
      return res.status(409).json({ success: false, message });
    }

    res.status(200).json({
      success: true,
      data: {
        ticket: serializeTicket(ticket),
        room
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Requester rejects the locked helper and resumes matching
// @route   POST /api/tickets/:id/reject
// @access  Private
export const rejectHelper = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket id' });
    }

    const { ticket, message } = await rejectLockedHelper(
      req.app.get('io'),
      req.params.id,
      req.user._id
    );

    if (!ticket) {
      return res.status(409).json({ success: false, message });
    }

    res.status(200).json({
      success: true,
      data: serializeTicket(ticket)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a ticket
// @route   POST /api/tickets/:id/cancel
// @access  Private
export const cancelMyTicket = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket id' });
    }

    const { ticket, message } = await cancelTicket(
      req.app.get('io'),
      req.params.id,
      req.user._id
    );

    if (!ticket) {
      return res.status(409).json({ success: false, message });
    }

    res.status(200).json({
      success: true,
      data: serializeTicket(ticket)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve a ticket
// @route   POST /api/tickets/:id/resolve
// @access  Private
export const resolveMyTicket = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket id' });
    }

    const { ticket, message } = await resolveTicket(
      req.app.get('io'),
      req.params.id,
      req.user._id
    );

    if (!ticket) {
      return res.status(409).json({ success: false, message });
    }

    res.status(200).json({
      success: true,
      data: serializeTicket(ticket)
    });
  } catch (error) {
    next(error);
  }
};
