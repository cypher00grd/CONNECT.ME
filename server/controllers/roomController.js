// controllers/roomController.js

import Room from '../models/Room.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import Booking from '../models/Booking.js';

// -----------------------------------------------------
// CREATE ROOM
// -----------------------------------------------------
export const createRoom = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
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
      category: category || 'other',
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

    if (!title || !scheduledStartTime || entryFee === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Title, scheduledStartTime, and entryFee are required'
      });
    }

    const room = await Room.create({
      title,
      description: description || '',
      category: category || 'live_event',
      creator: req.user._id,
      type: 'live_event',
      status: 'scheduled',
      scheduledStartTime: new Date(scheduledStartTime),
      entryFee: Number(entryFee),
      participants: [{ user: req.user._id }]
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
        message: `${creator.displayName} scheduled a Live Event: "${title}". Book your ticket now!`
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
            message: `${creator.displayName} scheduled a Live Event: "${title}". Book your ticket now!`
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
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (room.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to start this event' });
    }

    if (room.status !== 'scheduled') {
      return res.status(400).json({ success: false, message: 'Room is not scheduled' });
    }

    room.status = 'active';
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
    const user = await User.findById(req.user._id);
    const userBookings = await Booking.find({ user: req.user._id, paymentStatus: 'paid' });
    const bookedRoomIds = userBookings.map(b => b.room);

    const rooms = await Room.find({
      $or: [
        { creator: { $in: [...user.following, user._id] }, status: 'active' },
        { _id: { $in: bookedRoomIds }, status: 'scheduled' },
        { creator: user._id, status: 'scheduled' }
      ]
    })
      .populate('creator', 'username displayName avatar')
      .populate('participants.user', 'username displayName avatar')
      .sort({ createdAt: -1 });

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
    const rooms = await Room.find({ creator: req.params.userId, status: 'scheduled' })
      .populate('creator', 'username displayName avatar')
      .sort({ scheduledStartTime: 1 });

    // Determine if the requesting user has booked each room
    const roomsWithBookingStatus = await Promise.all(rooms.map(async (room) => {
      let isBooked = false;
      // The creator inherently has access
      if (room.creator._id.toString() === req.user._id.toString()) {
        isBooked = true;
      } else {
        const booking = await Booking.findOne({
          user: req.user._id,
          room: room._id,
          paymentStatus: 'paid'
        });
        isBooked = !!booking;
      }

      return {
        ...room.toObject(),
        isBooked
      };
    }));

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
    const room = await Room.findById(req.params.id)
      .populate('creator', 'username displayName avatar followers')
      .populate('participants.user', 'username displayName avatar');

    if (!room)
      return res.status(404).json({ success: false, message: 'Room not found' });

    const isCreator = room.creator._id.toString() === req.user._id.toString();
    const isFollower = room.creator.followers.some(
      (f) => f.toString() === req.user._id.toString()
    );

    // 🛡️ WebRTC ACCESS CONTROL: Live Events require explicit paid tickets
    if (room.type === 'live_event' && !isCreator) {
      const booking = await Booking.findOne({
        user: req.user._id,
        room: room._id,
        paymentStatus: 'paid'
      });

      if (!booking) {
        return res.status(403).json({
          success: false,
          message: 'You must pre-book a ticket to view this live event'
        });
      }
    }

    if (!isCreator && !isFollower && room.type !== 'live_event')
      return res.status(403).json({
        success: false,
        message: 'You must follow this user to view this room'
      });

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
    const room = await Room.findById(req.params.id)
      .populate('creator', 'username displayName avatar followers');

    if (!room)
      return res.status(404).json({ success: false, message: 'Room not found' });

    if (room.status !== 'active')
      return res.status(400).json({
        success: false,
        message: 'This room has ended'
      });

    const isCreator = room.creator._id.toString() === req.user._id.toString();

    // 🛡️ WebRTC ACCESS CONTROL: Live Events require explicit paid tickets
    if (room.type === 'live_event' && !isCreator) {
      const booking = await Booking.findOne({
        user: req.user._id,
        room: room._id,
        paymentStatus: 'paid'
      });

      if (!booking) {
        return res.status(403).json({
          success: false,
          message: 'You must pre-book a ticket to join this live event'
        });
      }
    }

    const isFollower = room.creator.followers.some(
      (f) => f.toString() === req.user._id.toString()
    );

    if (!isCreator && !isFollower && room.type !== 'live_event')
      return res.status(403).json({
        success: false,
        message: 'You must follow this user to join'
      });

    if (room.participants.length >= room.maxParticipants)
      return res.status(400).json({
        success: false,
        message: 'Room is full'
      });

    const alreadyJoined = room.participants.some(
      (p) => p.user.toString() === req.user._id.toString()
    );

    if (!alreadyJoined) {
      room.participants.push({ user: req.user._id });
      await room.save();
    }

    const updatedRoom = await Room.findById(room._id)
      .populate('creator', 'username displayName avatar')
      .populate('participants.user', 'username displayName avatar');

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
    const room = await Room.findById(req.params.id);

    if (!room)
      return res.status(404).json({ success: false, message: 'Room not found' });

    room.participants = room.participants.filter(
      (p) => p.user.toString() !== req.user._id.toString()
    );

    await room.save();

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
    const room = await Room.findById(req.params.id);

    if (!room)
      return res.status(404).json({ success: false, message: 'Room not found' });

    if (room.creator.toString() !== req.user._id.toString())
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
    const { limit = 50, before } = req.query;

    const query = { room: req.params.id };

    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(query)
      .populate('sender', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: messages.reverse()
    });
  } catch (err) {
    next(err);
  }
};
