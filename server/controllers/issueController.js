import mongoose from 'mongoose';
import IssuePost from '../models/IssuePost.js';
import IssueRequest from '../models/IssueRequest.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import {
  createIssueCheckoutSession,
  getIssueResolverCredit,
  populateIssue,
  serializeIssue
} from '../services/issuePaymentService.js';
import { inferCategoryFromTags } from '../utils/categories.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const toIdString = (value) => {
  if (!value) return '';
  return (value._id || value).toString();
};

const sameId = (left, right) => toIdString(left) === toIdString(right);
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

const serializeRequest = (request) => {
  const source = request?.toObject ? request.toObject() : request;
  if (!source) return null;

  return {
    _id: source._id,
    issue: source.issue,
    resolver: source.resolver,
    message: source.message || '',
    status: source.status,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt
  };
};

const getRequestsForIssues = async (issueIds) => {
  if (!issueIds.length) return new Map();

  const requests = await IssueRequest.find({ issue: { $in: issueIds } })
    .populate('resolver', 'username displayName avatar rating reviewsCount skills')
    .sort({ createdAt: -1 });

  return requests.reduce((map, request) => {
    const key = toIdString(request.issue);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(serializeRequest(request));
    return map;
  }, new Map());
};

const emitIssueToParticipants = (io, issue, event) => {
  const payload = serializeIssue(issue);
  [issue.poster, issue.acceptedResolver].map(toIdString).filter(Boolean).forEach((userId) => {
    io?.to(userId).emit(event, { issue: payload });
  });
};

// @desc    Create a posted issue
// @route   POST /api/issues
// @access  Private
export const createIssue = async (req, res, next) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const details = typeof req.body.details === 'string' ? req.body.details.trim() : '';
    const tags = normalizeTags(req.body.tags);
    const screenshots = normalizeScreenshots(req.body.screenshots);
    const sessionType = normalizeSessionType(req.body.sessionType);
    const techStack = normalizeTags(req.body.techStack, 8);
    const difficulty = normalizeDifficulty(req.body.difficulty);
    const repoUrl = normalizeUrl(req.body.repoUrl);
    const errorContext = typeof req.body.errorContext === 'string' ? req.body.errorContext.trim() : '';
    const bountyAmount = Number(req.body.bountyAmount || 0);

    if (!title || !details || tags.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title, details, and at least one tag are required'
      });
    }

    if (!Number.isFinite(bountyAmount) || bountyAmount < 0) {
      return res.status(400).json({ success: false, message: 'Bounty must be a valid non-negative number' });
    }

    const issue = await IssuePost.create({
      poster: req.user._id,
      title,
      details,
      tags,
      screenshots,
      sessionType,
      techStack,
      difficulty,
      repoUrl,
      errorContext,
      bountyAmount,
      status: 'open'
    });

    const populatedIssue = await populateIssue(IssuePost.findById(issue._id));

    res.status(201).json({
      success: true,
      data: serializeIssue(populatedIssue)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get open posted issues
// @route   GET /api/issues/feed
// @access  Private
export const getIssueFeed = async (req, res, next) => {
  try {
    const issues = await populateIssue(
      IssuePost.find({
        poster: { $ne: req.user._id },
        status: 'open'
      })
        .sort({ bountyAmount: -1, createdAt: -1 })
        .limit(50)
    );
    const requestedIssueIds = new Set(
      (await IssueRequest.distinct('issue', {
        resolver: req.user._id,
        issue: { $in: issues.map((issue) => issue._id) }
      })).map(toIdString)
    );

    res.status(200).json({
      success: true,
      data: issues.map((issue) => ({
        ...serializeIssue(issue),
        requestedByMe: requestedIssueIds.has(toIdString(issue._id))
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get issues posted by or accepted by current user
// @route   GET /api/issues/my
// @access  Private
export const getMyIssues = async (req, res, next) => {
  try {
    const issues = await populateIssue(
      IssuePost.find({
        $or: [
          { poster: req.user._id },
          { acceptedResolver: req.user._id }
        ]
      })
        .sort({ updatedAt: -1 })
        .limit(100)
    );
    const issueIds = issues.map((issue) => issue._id);
    const requestMap = await getRequestsForIssues(issueIds);

    res.status(200).json({
      success: true,
      data: issues.map((issue) => (
        serializeIssue(issue, sameId(issue.poster, req.user._id)
          ? requestMap.get(toIdString(issue._id)) || []
          : [])
      ))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request to resolve an issue
// @route   POST /api/issues/:id/requests
// @access  Private
export const createIssueRequest = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid issue id' });
    }

    const issue = await IssuePost.findById(req.params.id);
    if (!issue || issue.status !== 'open') {
      return res.status(404).json({ success: false, message: 'Issue is no longer open' });
    }

    if (sameId(issue.poster, req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot request your own issue' });
    }

    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    const request = await IssueRequest.create({
      issue: issue._id,
      resolver: req.user._id,
      message
    });

    const populatedRequest = await IssueRequest.findById(request._id)
      .populate('resolver', 'username displayName avatar rating reviewsCount skills');
    const populatedIssue = await populateIssue(IssuePost.findById(issue._id));

    req.app.get('io')?.to(toIdString(issue.poster)).emit('issue_request_created', {
      issue: serializeIssue(populatedIssue, [serializeRequest(populatedRequest)]),
      request: serializeRequest(populatedRequest)
    });

    res.status(201).json({
      success: true,
      data: serializeRequest(populatedRequest)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'You already requested this issue' });
    }
    next(error);
  }
};

// @desc    Approve a resolver request and create private issue session
// @route   POST /api/issues/:id/requests/:requestId/approve
// @access  Private
export const approveIssueRequest = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.requestId)) {
      return res.status(400).json({ success: false, message: 'Invalid issue or request id' });
    }

    const issue = await IssuePost.findOne({
      _id: req.params.id,
      poster: req.user._id,
      status: 'open'
    });

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Open issue not found' });
    }

    const request = await IssueRequest.findOne({
      _id: req.params.requestId,
      issue: issue._id,
      status: 'pending'
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Pending request not found' });
    }

    const issueTechTags = issue.techStack?.length ? issue.techStack : issue.tags;
    const room = await Room.create({
      title: `Issue: ${issue.title}`,
      description: issue.details.slice(0, 500),
      category: inferCategoryFromTags(issueTechTags),
      techTags: issueTechTags,
      sessionType: issue.sessionType || 'debugging',
      difficulty: issue.difficulty || 'intermediate',
      repositoryUrl: issue.repoUrl || '',
      creator: req.user._id,
      type: 'issue_session',
      issue: issue._id,
      maxParticipants: 2,
      isVideoEnabled: true,
      participants: [{ user: req.user._id }, { user: request.resolver }]
    });

    issue.status = 'in_progress';
    issue.acceptedResolver = request.resolver;
    issue.room = room._id;
    await issue.save();

    request.status = 'approved';
    await request.save();

    await IssueRequest.updateMany(
      { issue: issue._id, _id: { $ne: request._id }, status: 'pending' },
      { $set: { status: 'rejected' } }
    );

    const populatedIssue = await populateIssue(IssuePost.findById(issue._id));
    const populatedRoom = await Room.findById(room._id)
      .populate('creator', 'username displayName avatar')
      .populate('participants.user', 'username displayName avatar')
      .populate('issue', 'title status bountyAmount paymentStatus poster acceptedResolver');
    const payload = serializeIssue(populatedIssue);

    [issue.poster, request.resolver].map(toIdString).forEach((userId) => {
      req.app.get('io')?.to(userId).emit('issue_request_approved', {
        issue: payload,
        room: populatedRoom
      });
    });

    res.status(200).json({
      success: true,
      data: {
        issue: payload,
        room: populatedRoom
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a resolver request
// @route   POST /api/issues/:id/requests/:requestId/reject
// @access  Private
export const rejectIssueRequest = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.requestId)) {
      return res.status(400).json({ success: false, message: 'Invalid issue or request id' });
    }

    const issue = await IssuePost.findOne({
      _id: req.params.id,
      poster: req.user._id
    });

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    const request = await IssueRequest.findOneAndUpdate(
      {
        _id: req.params.requestId,
        issue: issue._id,
        status: 'pending'
      },
      { $set: { status: 'rejected' } },
      { new: true }
    ).populate('resolver', 'username displayName avatar rating reviewsCount skills');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Pending request not found' });
    }

    req.app.get('io')?.to(toIdString(request.resolver)).emit('issue_request_rejected', {
      issueId: issue._id,
      requestId: request._id
    });

    res.status(200).json({
      success: true,
      data: serializeRequest(request)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark issue fixed, optionally collecting bounty
// @route   POST /api/issues/:id/resolve
// @access  Private
export const resolveIssue = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid issue id' });
    }

    const issue = await IssuePost.findOne({
      _id: req.params.id,
      poster: req.user._id,
      status: 'in_progress',
      acceptedResolver: { $ne: null }
    });

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue is not ready to resolve' });
    }

    if (issue.bountyAmount > 0 && issue.paymentStatus !== 'paid') {
      const session = await createIssueCheckoutSession({ issue, poster: req.user });
      issue.paymentStatus = 'pending';
      issue.stripeCheckoutSessionId = session.id;
      await issue.save();

      const populatedIssue = await populateIssue(IssuePost.findById(issue._id));

      return res.status(200).json({
        success: true,
        data: serializeIssue(populatedIssue),
        payment: {
          required: true,
          url: session.url,
          sessionId: session.id
        }
      });
    }

    issue.status = 'resolved';
    issue.resolvedAt = new Date();
    await issue.save();

    if (issue.acceptedResolver && issue.bountyAmount <= 0) {
      await IssueRequest.updateMany(
        { issue: issue._id, status: 'pending' },
        { $set: { status: 'rejected' } }
      );
    } else if (issue.acceptedResolver && issue.bountyAmount > 0) {
      await User.findByIdAndUpdate(issue.acceptedResolver, {
        $inc: {
          walletBalance: getIssueResolverCredit(issue.bountyAmount),
          reputationPoints: 15
        }
      });
    }

    if (issue.room) {
      await Room.findByIdAndUpdate(issue.room, {
        status: 'ended',
        endedAt: new Date()
      });
    }

    const populatedIssue = await populateIssue(IssuePost.findById(issue._id));
    emitIssueToParticipants(req.app.get('io'), populatedIssue, 'issue_resolved');
    if (issue.room) {
      req.app.get('io')?.to(toIdString(issue.room)).emit('room_ended', {
        roomId: issue.room,
        message: 'The issue session has been marked fixed'
      });
    }

    res.status(200).json({
      success: true,
      data: serializeIssue(populatedIssue)
    });
  } catch (error) {
    next(error);
  }
};
