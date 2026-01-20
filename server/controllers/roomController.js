import Room from '../models/Room.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Private
export const createRoom = async (req, res, next) => {
  try {
    const { title, description, category, isVideoEnabled, autoDeleteMinutes, maxParticipants } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Room title is required'
      });
    }

    // Calculate auto delete time
    let autoDeleteAt = null;
    if (autoDeleteMinutes && autoDeleteMinutes > 0) {
      autoDeleteAt = new Date(Date.now() + autoDeleteMinutes * 60 * 1000);
    }

    // Create room
    const room = await Room.create({
      title,
      description: description || '',
      category: category || 'other',
      creator: req.user._id,
      isVideoEnabled: isVideoEnabled || false,
      autoDeleteAt,
      maxParticipants: maxParticipants || 10,
      participants: [{ user: req.user._id }]
    });

    // Populate room data
    const populatedRoom = await Room.findById(room._id)
      .populate('creator', 'username displayName avatar')
      .populate('participants.user', 'username displayName avatar');

    // Notify all followers
    const creator = await User.findById(req.user._id).populate('followers');

    if (creator.followers.length > 0) {
      // Create notifications
      const notifications = creator.followers.map((follower) => ({
        recipient: follower._id,
        sender: req.user._id,
        type: 'room_created',
        room: room._id,
        message: `${creator.displayName} started a room: "${title}"`
      }));

      await Notification.insertMany(notifications);

      // Send real-time notifications
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

    res.status(201).json({
      success: true,
      data: populatedRoom
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get feed rooms (from followed users)
// @route   GET /api/rooms/feed
// @access  Private
export const getFeedRooms = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    const rooms = await Room.find({
      creator: { $in: [...user.following, user._id] },
      status: 'active'
    })
      .populate('creator', 'username displayName avatar')
      .populate('participants.user', 'username displayName avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: rooms
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my rooms (created by me)
// @route   GET /api/rooms/my-rooms
// @access  Private
export const getMyRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({ creator: req.user._id })
      .populate('creator', 'username displayName avatar')
      .populate('participants.user', 'username displayName avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: rooms
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Private
export const getRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('creator', 'username displayName avatar followers')
      .populate('participants.user', 'username displayName avatar');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user can access room
    const isCreator = room.creator._id.toString() === req.user._id.toString();
    const isFollower = room.creator.followers.some(
      (f) => f.toString() === req.user._id.toString()
    );

    if (!isCreator && !isFollower) {
      return res.status(403).json({
        success: false,
        message: 'You must follow this user to view their room'
      });
    }

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join a room
// @route   POST /api/rooms/:id/join
// @access  Private
export const joinRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('creator', 'username displayName avatar followers');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (room.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This room has ended'
      });
    }

    // Check if user follows the creator or is the creator
    const isCreator = room.creator._id.toString() === req.user._id.toString();
    const isFollower = room.creator.followers.some(
      (f) => f.toString() === req.user._id.toString()
    );

    if (!isCreator && !isFollower) {
      return res.status(403).json({
        success: false,
        message: 'You must follow this user to join their room'
      });
    }

    // Check if room is full
    if (room.participants.length >= room.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Room is full'
      });
    }

    // Check if already joined
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

    // Notify room via socket
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

    res.status(200).json({
      success: true,
      data: updatedRoom
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave a room
// @route   POST /api/rooms/:id/leave
// @access  Private
export const leaveRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Remove user from participants
    room.participants = room.participants.filter(
      (p) => p.user.toString() !== req.user._id.toString()
    );

    await room.save();

    // Notify room via socket
    const io = req.app.get('io');
    if (io) {
      io.to(room._id.toString()).emit('user_left', {
        userId: req.user._id,
        username: req.user.username,
        participantCount: room.participants.length
      });
    }

    res.status(200).json({
      success: true,
      message: 'Left room successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    End/destroy a room
// @route   DELETE /api/rooms/:id
// @access  Private (Creator only)
export const destroyRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Only creator can destroy
    if (room.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can end this room'
      });
    }

    // Update room status
    room.status = 'ended';
    room.endedAt = new Date();
    await room.save();

    // Notify all participants
    const io = req.app.get('io');
    if (io) {
      io.to(room._id.toString()).emit('room_ended', {
        roomId: room._id,
        message: 'Room has been ended by the creator'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Room ended successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get room messages
// @route   GET /api/rooms/:id/messages
// @access  Private
export const getRoomMessages = async (req, res, next) => {
  try {
    const { limit = 50, before } = req.query;

    const query = { room: req.params.id };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: messages.reverse()
    });
  } catch (error) {
    next(error);
  }
};