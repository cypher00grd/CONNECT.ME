// controllers/roomController.js

import mongoose from 'mongoose';
import Room from '../models/Room.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import Booking from '../models/Booking.js';
import { endTicketSessionEarly } from '../services/ticketMatchingService.js';
import { normalizeCategory } from '../utils/categories.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const toIdString = (value) => {
  if (!value) return '';
  return (value._id || value).toString();
};

const sameId = (left, right) => toIdString(left) === toIdString(right);

const SESSION_TYPES = new Set([
  'pair_programming',
  'code_review',
  'debugging',
  'system_design',
  'mock_interview',
  'workshop',
  'open_discussion',
  'mentoring'
]);

const DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced', 'any']);

const normalizeTags = (tags, limit = 8) => {
  if (!Array.isArray(tags)) return [];

  return [
    ...new Set(
      tags
        .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
        .filter(Boolean)
    )
  ].slice(0, limit);
};

const normalizeUrl = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '';
  } catch {
    return '';
  }
};

const getRoomAccess = async (room, userId) => {
  const isCreator = sameId(room.creator?._id || room.creator, userId);

  if (isCreator) {
    return { isCreator, isAllowed: true };
  }

  if (room.type === 'live_event') {
    const booking = await Booking.exists({
      user: userId,
      room: room._id,
      paymentStatus: 'paid'
    });

    return { isCreator, isAllowed: !!booking };
  }

  if (room.type === 'vod_session' || room.type === 'issue_session') {
    const isParticipant = (room.participants || []).some((participant) =>
      sameId(participant.user, userId)
    );

    return { isCreator, isAllowed: isParticipant };
  }

  const followers = room.creator?.followers || [];
  const isFollower = followers.some((follower) => sameId(follower, userId));

  return { isCreator, isAllowed: isFollower };
};

const getAccessDeniedMessage = (room) => {
  if (room.type === 'live_event') {
    return 'You must pre-book a ticket to view this live event';
  }

  if (room.type === 'vod_session' || room.type === 'issue_session') {
    return 'You are not a participant in this private session';
  }

  return 'You must follow this user to view this room';
};

// -----------------------------------------------------
// CREATE ROOM
// -----------------------------------------------------
export const createRoom = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      techTags,
      difficulty,
      sessionType,
      repositoryUrl,
      isVideoEnabled,
      autoDeleteMinutes,
      autoDeleteAt,
      maxParticipants
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Room title is required'
      });
    }

    let finalAutoDeleteAt = null;

    // OPTION 1 → User provides a specific date/time
    if (autoDeleteAt) {
      const parsed = new Date(autoDeleteAt);

      if (isNaN(parsed.getTime()) || parsed <= Date.now()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid auto delete time'
        });
      }

      finalAutoDeleteAt = parsed;
    }

    // OPTION 2 → Minutes from now
    else if (autoDeleteMinutes && autoDeleteMinutes > 0) {
      finalAutoDeleteAt = new Date(Date.now() + autoDeleteMinutes * 60 * 1000);
    }

    // OPTION 3 → Manual delete (null)

    const room = await Room.create({
      title,
      description: description || '',
      category: normalizeCategory(category),
      techTags: normalizeTags(techTags),
      difficulty: DIFFICULTIES.has(difficulty) ? difficulty : 'any',
      sessionType: SESSION_TYPES.has(sessionType) ? sessionType : 'open_discussion',
      repositoryUrl: normalizeUrl(repositoryUrl),
      creator: req.user._id,
      isVideoEnabled: isVideoEnabled || false,
      autoDeleteAt: finalAutoDeleteAt,
      maxParticipants: maxParticipants || 10,
      participants: [{ user: req.user._id }]
    });

    const populatedRoom = await Room.findById(room._id)
      .populate('creator', 'username displayName avatar')
      .populate('participants.user', 'username displayName avatar');

    // Real-time + DB notifications for followers
    const creator = await User.findById(req.user._id).populate('followers');

    if (creator.followers.length > 0) {
      const notifications = creator.followers.map((follower) => ({
        recipient: follower._id,
        sender: req.user._id,
        type: 'room_created',
        room: room._id,
        message: `${creator.displayName} started a room: "${title}"`
      }));

      await Notification.insertMany(notifications);

      const io = req.app.get('io');
      if (io) {
        creator.followers.forEach((follower) => {
          io.to(follower._id.toString()).emit('notification', {
            type: 'room_created',
            room: populatedRoom,
            sender: {
              _id: creator._id,
              username: creator.username,
              displayName: creator.displayName,
              avatar: creator.avatar
            },
            message: `${creator.displayName} started a room: "${title}"`
          });
        });
      }
    }

    res.status(201).json({ success: true, data: populatedRoom });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------
// SCHEDULE LIVE EVENT
// -----------------------------------------------------
export const scheduleRoom = async (req, res, next) => {
  try {
    const { title, description, category, scheduledStartTime, entryFee } = req.body;
    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    const scheduledDate = new Date(scheduledStartTime);
    const entryFeeNumber = Number(entryFee);

    if (!normalizedTitle || !scheduledStartTime || entryFee === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Title, scheduledStartTime, and entryFee are required'
      });
    }

    if (Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheduled start time'
      });
    }

    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled start time must be in the future'
      });
    }

    if (!Number.isInteger(entryFeeNumber) || entryFeeNumber < 1) {
      return res.status(400).json({
        success: false,
        message: 'Entry fee must be a whole rupee amount of at least 1'
      });
    }

    const room = await Room.create({
      title: normalizedTitle,
      description: typeof description === 'string' ? description.trim() : '',
      category: normalizeCategory(category),
      sessionType: 'workshop',
      difficulty: 'any',
      creator: req.user._id,
      type: 'live_event',
      status: 'scheduled',
      scheduledStartTime: scheduledDate,
      entryFee: entryFeeNumber,
      participants: []
    });

    const populatedRoom = await Room.findById(room._id)
      .populate('creator', 'username displayName avatar')
      .populate('participants.user', 'username displayName avatar');

    // Notify followers
    const creator = await User.findById(req.user._id).populate('followers');

    if (creator.followers.length > 0) {
      const notifications = creator.followers.map((follower) => ({
        recipient: follower._id,
        sender: req.user._id,
        type: 'announcement', // Using announcement type since we want it to go to inbox
        room: room._id,
        message: `${creator.displayName} scheduled a Live Event: "${normalizedTitle}". Book your ticket now!`
      }));

      await Notification.insertMany(notifications);

      const io = req.app.get('io');
      if (io) {
        creator.followers.forEach((follower) => {
          io.to(follower._id.toString()).emit('follower_announcement', {
            type: 'announcement',
            room: populatedRoom,
            sender: {
              _id: creator._id,
              username: creator.username,
              displayName: creator.displayName,
              avatar: creator.avatar
            },
            message: `${creator.displayName} scheduled a Live Event: "${normalizedTitle}". Book your ticket now!`
          });
        });
      }
    }

    res.status(201).json({ success: true, data: populatedRoom });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------
// START SCHEDULED EVENT
// -----------------------------------------------------
export const startEvent = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid room id' });
    }

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (!sameId(room.creator, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to start this event' });
    }

    if (room.type !== 'live_event') {
      return res.status(400).json({ success: false, message: 'Only scheduled live events can be started here' });
    }

    if (room.status !== 'scheduled') {
      return res.status(400).json({ success: false, message: 'Room is not scheduled' });
    }

    if (!room.scheduledStartTime || room.scheduledStartTime > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This event can only be started at its scheduled time',
        startsAt: room.scheduledStartTime
      });
    }

    room.status = 'active';
    const creatorAlreadyJoined = room.participants.some((participant) =>
      sameId(participant.user, req.user._id)
    );
    if (!creatorAlreadyJoined) {
      room.participants.push({ user: req.user._id });
    }
    await room.save();

    const populatedRoom = await Room.findById(room._id)
      .populate('creator', 'username displayName avatar')
      .populate('participants.user', 'username displayName avatar');

    res.status(200).json({ success: true, data: populatedRoom });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------
// FEED ROOMS
// -----------------------------------------------------
export const getFeedRooms = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('following').lean();
    const bookedRoomIds = await Booking.distinct('room', {
      user: req.user._id,
      paymentStatus: 'paid'
    });

    const rooms = await Room.find({
      $or: [
        { creator: { $in: [...user.following, user._id] }, status: 'active', type: { $in: ['standard', 'live_event'] } },
        { _id: { $in: bookedRoomIds }, status: 'scheduled' },
        { creator: user._id, status: 'scheduled' }
      ]
    })
      .populate('creator', 'username displayName avatar')
      .populate('participants.user', 'username displayName avatar')
      .sort({ status: 1, scheduledStartTime: 1, createdAt: -1 });

    res.status(200).json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------
// GET MY ROOMS
// -----------------------------------------------------
export const getMyRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({ creator: req.user._id })
      .populate('creator', 'username displayName avatar')
      .populate('participants.user', 'username displayName avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------
// GET USER SCHEDULED EVENTS
// -----------------------------------------------------
export const getUserScheduledRooms = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const rooms = await Room.find({ creator: req.params.userId, status: 'scheduled' })
      .populate('creator', 'username displayName avatar')
      .sort({ scheduledStartTime: 1 })
      .lean();

    const roomIds = rooms.map((room) => room._id);
    const bookedRoomIds = new Set(
      (await Booking.distinct('room', {
        user: req.user._id,
        room: { $in: roomIds },
        paymentStatus: 'paid'
      })).map(toIdString)
    );

    const now = new Date();
    const roomsWithBookingStatus = rooms.map((room) => {
      const isCreator = sameId(room.creator?._id, req.user._id);

      return {
        ...room,
        isBooked: isCreator || bookedRoomIds.has(toIdString(room._id)),
        isStartable: isCreator && room.scheduledStartTime <= now
      };
    });

    res.status(200).json({ success: true, data: roomsWithBookingStatus });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------
// GET SINGLE ROOM
// -----------------------------------------------------
export const getRoom = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid room id' });
    }

    const room = await Room.findById(req.params.id)
      .populate('creator', 'username displayName avatar followers')
      .populate('participants.user', 'username displayName avatar')
      .populate('ticket', 'title status estimatedMinutes bountyAmount paymentStatus sessionStartedAt minimumMetAt actualDurationSeconds requester acceptedBy')
      .populate('issue', 'title status bountyAmount paymentStatus poster acceptedResolver')
      .populate('sharedEditor.updatedBy', 'username displayName avatar');

    if (!room)
      return res.status(404).json({ success: false, message: 'Room not found' });

    const isCreator = sameId(room.creator._id, req.user._id);

    if (room.status === 'scheduled') {
      return res.status(409).json({
        success: false,
        message: 'This live event has not started yet',
        startsAt: room.scheduledStartTime,
        isStartable: isCreator && room.scheduledStartTime <= new Date()
      });
    }

    const { isAllowed } = await getRoomAccess(room, req.user._id);
    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: getAccessDeniedMessage(room)
      });
    }

    res.status(200).json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------
// JOIN ROOM
// -----------------------------------------------------
export const joinRoom = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid room id' });
    }

    const room = await Room.findById(req.params.id)
      .populate('creator', 'username displayName avatar followers');

    if (!room)
      return res.status(404).json({ success: false, message: 'Room not found' });

    if (room.status !== 'active')
      return res.status(400).json({
        success: false,
        message: room.status === 'scheduled'
          ? 'This live event has not started yet'
          : 'This room has ended'
      });

    const { isAllowed } = await getRoomAccess(room, req.user._id);
    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: getAccessDeniedMessage(room)
      });
    }

    const alreadyJoined = room.participants.some(
      (p) => sameId(p.user, req.user._id)
    );

    if (!alreadyJoined && room.participants.length >= room.maxParticipants)
      return res.status(400).json({
        success: false,
        message: 'Room is full'
      });

    if (!alreadyJoined) {
      room.participants.push({ user: req.user._id });
      await room.save();
    }

    const updatedRoom = await Room.findById(room._id)
      .populate('creator', 'username displayName avatar')
      .populate('participants.user', 'username displayName avatar')
      .populate('ticket', 'title status estimatedMinutes bountyAmount paymentStatus sessionStartedAt minimumMetAt actualDurationSeconds requester acceptedBy')
      .populate('issue', 'title status bountyAmount paymentStatus poster acceptedResolver')
      .populate('sharedEditor.updatedBy', 'username displayName avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(room._id.toString()).emit('user_joined', {
        user: {
          _id: req.user._id,
          username: req.user.username,
          displayName: req.user.displayName,
          avatar: req.user.avatar
        },
        participantCount: updatedRoom.participants.length
      });
    }

    res.status(200).json({ success: true, data: updatedRoom });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------
// LEAVE ROOM
// -----------------------------------------------------
export const leaveRoom = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid room id' });
    }

    const room = await Room.findById(req.params.id);

    if (!room)
      return res.status(404).json({ success: false, message: 'Room not found' });

    if (room.type === 'vod_session') {
      await endTicketSessionEarly(req.app.get('io'), room._id, req.user._id);
    }

    if (room.type !== 'vod_session' && room.type !== 'issue_session') {
      room.participants = room.participants.filter(
        (p) => !sameId(p.user, req.user._id)
      );

      await room.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.to(room._id.toString()).emit('user_left', {
        userId: req.user._id,
        participantCount: room.participants.length
      });
    }

    res.status(200).json({ success: true, message: 'Left room successfully' });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------
// DESTROY ROOM (MANUAL END)
// -----------------------------------------------------
export const destroyRoom = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid room id' });
    }

    const room = await Room.findById(req.params.id);

    if (!room)
      return res.status(404).json({ success: false, message: 'Room not found' });

    if (!sameId(room.creator, req.user._id))
      return res.status(403).json({
        success: false,
        message: 'Only the creator can end this room'
      });

    room.status = 'ended';
    room.endedAt = new Date();
    await room.save();

    const io = req.app.get('io');
    if (io) {
      io.to(room._id.toString()).emit('room_ended', {
        roomId: room._id,
        message: 'Room has been ended by the creator'
      });
    }

    res.status(200).json({ success: true, message: 'Room ended successfully' });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------
// GET ROOM MESSAGES
// -----------------------------------------------------
export const getRoomMessages = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid room id' });
    }

    const { limit = 50, before } = req.query;
    const room = await Room.findById(req.params.id)
      .populate('creator', 'followers');

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (room.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Messages are available only while the room is live'
      });
    }

    const { isAllowed } = await getRoomAccess(room, req.user._id);
    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: getAccessDeniedMessage(room)
      });
    }

    const parsedLimit = Number.parseInt(limit, 10);
    const safeLimit = Number.isInteger(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : 50;

    const query = { room: req.params.id };

    if (before) {
      const beforeDate = new Date(before);
      if (!Number.isNaN(beforeDate.getTime())) {
        query.createdAt = { $lt: beforeDate };
      }
    }

    const messages = await Message.find(query)
      .populate('sender', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .limit(safeLimit);

    res.status(200).json({
      success: true,
      data: messages.reverse()
    });
  } catch (err) {
    next(err);
  }
};
