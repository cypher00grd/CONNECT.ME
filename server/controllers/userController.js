import mongoose from 'mongoose';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

// @desc    Search users
// @route   GET /api/users/search?q=query
// @access  Private
export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const users = await User.find({
      $and: [
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { displayName: { $regex: q, $options: 'i' } }
          ]
        },
        { _id: { $ne: req.user._id } }
      ]
    })
      .select('username displayName avatar bio followers')
      .limit(20);

    // Add isFollowing field
    const usersWithFollowStatus = users.map((user) => ({
      ...user.toObject(),
      isFollowing: req.user.following.includes(user._id),
      followersCount: user.followers.length
    }));

    res.status(200).json({
      success: true,
      data: usersWithFollowStatus
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile by username
// @route   GET /api/users/:username
// @access  Private
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() })
      .select('-email')
      .populate('followers', 'username displayName avatar')
      .populate('following', 'username displayName avatar');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if current user follows this user
    const isFollowing = user.followers.some(
      (follower) => follower._id.toString() === req.user._id.toString()
    );

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        isFollowing,
        isOwnProfile: user._id.toString() === req.user._id.toString()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Follow a user
// @route   POST /api/users/:id/follow
// @access  Private
export const followUser = async (req, res, next) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);

    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Can't follow yourself
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You can't follow yourself"
      });
    }

    // Check if already following
    if (currentUser.following.includes(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'You are already following this user'
      });
    }

    // Add to following/followers
    currentUser.following.push(req.params.id);
    userToFollow.followers.push(req.user._id);

    await currentUser.save();
    await userToFollow.save();

    // Create notification
    await Notification.create({
      recipient: userToFollow._id,
      sender: req.user._id,
      type: 'follow',
      message: `${currentUser.displayName} started following you`
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(userToFollow._id.toString()).emit('notification', {
        type: 'follow',
        sender: {
          _id: currentUser._id,
          username: currentUser.username,
          displayName: currentUser.displayName,
          avatar: currentUser.avatar
        },
        message: `${currentUser.displayName} started following you`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Followed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unfollow a user
// @route   POST /api/users/:id/unfollow
// @access  Private
export const unfollowUser = async (req, res, next) => {
  try {
    const userToUnfollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);

    if (!userToUnfollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if not following
    if (!currentUser.following.includes(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'You are not following this user'
      });
    }

    // Remove from following/followers
    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== req.params.id
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(
      (id) => id.toString() !== req.user._id.toString()
    );

    await currentUser.save();
    await userToUnfollow.save();

    res.status(200).json({
      success: true,
      message: 'Unfollowed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user notifications
// @route   GET /api/users/notifications
// @access  Private
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'username displayName avatar')
      .populate('room', 'title category status')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/users/notifications/read
// @access  Private
export const markNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: 'Notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get suggested users to follow
// @route   GET /api/users/suggestions
// @access  Private
export const getSuggestions = async (req, res, next) => {
  try {
    // Get users that current user is not following
    const users = await User.find({
      _id: { $ne: req.user._id, $nin: req.user.following }
    })
      .select('username displayName avatar bio followers')
      .limit(10)
      .sort({ followers: -1 });

    const usersWithCount = users.map((user) => ({
      ...user.toObject(),
      followersCount: user.followers.length
    }));

    res.status(200).json({
      success: true,
      data: usersWithCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Broadcast a text announcement to all followers
// @route   POST /api/users/notify-followers
// @access  Private
export const notifyFollowers = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Broadcast message cannot be empty'
      });
    }

    // Fetch the current user to get their followers list
    const user = await User.findById(req.user._id).select('followers username displayName avatar');

    if (!user.followers || user.followers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'You have no followers to notify yet'
      });
    }

    // Prepare bulky DB Insertion objects for all offline followers
    const notificationsToInsert = user.followers.map(followerId => ({
      recipient: followerId,
      sender: user._id,
      type: 'announcement',
      message: message.trim()
    }));

    // Perform a single fast DB hit to save all announcements
    await Notification.insertMany(notificationsToInsert);

    // Get live socket instance
    const io = req.app.get('io');
    if (io) {
      // Broadcast live event to all online followers via their private socket rooms
      user.followers.forEach((followerId) => {
        io.to(followerId.toString()).emit('follower_announcement', {
          _id: new mongoose.Types.ObjectId(), // Generate temporary ID for frontend React key
          type: 'announcement',
          createdAt: new Date(),
          isRead: false,
          sender: {
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar
          },
          message: message.trim()
        });
      });
    }

    res.status(200).json({
      success: true,
      message: `Announcement broadcasted to ${user.followers.length} followers`
    });

  } catch (error) {
    next(error);
  }
};