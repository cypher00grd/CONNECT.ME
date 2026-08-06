import mongoose from 'mongoose';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { expandTechTags, normalizeTechTags } from '../data/techTaxonomy.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const toIdString = (value) => {
  if (!value) return '';
  return (value._id || value).toString();
};

const sameId = (left, right) => toIdString(left) === toIdString(right);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const userCardFields = [
  'username',
  'displayName',
  'avatar',
  'bio',
  'followers',
  'skills',
  'isInstructor',
  'rating',
  'reviewsCount',
  'reputationPoints',
  'badges',
  'githubUsername',
  'githubUrl',
  'techStack',
  'experienceLevel',
  'yearsOfExperience',
  'specialization',
  'sessionsCompleted',
  'issuesResolved',
  'codeReviewsGiven',
  'hoursHelped',
  'openToMentor',
  'lookingForHelp',
  'developerPreferences'
].join(' ');

const getComparableTechTags = (user = {}) => {
  const stack = user.techStack || {};
  return new Set([
    ...(user.skills || []),
    ...(stack.languages || []),
    ...(stack.frameworks || []),
    ...(stack.tools || []),
    user.specialization
  ].filter(Boolean).map((item) => item.toString().trim().toLowerCase()));
};

const buildDiscoveryFilters = (query = {}) => {
  const tech = normalizeTechTags([
    ...(Array.isArray(query.tech) ? query.tech : String(query.tech || '').split(',')),
    ...(Array.isArray(query.language) ? query.language : String(query.language || '').split(',')),
    ...(Array.isArray(query.framework) ? query.framework : String(query.framework || '').split(',')),
    ...(Array.isArray(query.tool) ? query.tool : String(query.tool || '').split(','))
  ]);
  const expanded = expandTechTags(tech);
  const filters = [];

  if (expanded.all.length > 0) {
    filters.push({
      $or: [
        { skills: { $in: expanded.all } },
        { 'techStack.languages': { $in: expanded.all } },
        { 'techStack.frameworks': { $in: expanded.all } },
        { 'techStack.tools': { $in: expanded.all } },
        { specialization: { $in: [...expanded.domains, ...expanded.direct] } }
      ]
    });
  }

  if (typeof query.specialization === 'string' && query.specialization.trim()) {
    filters.push({ specialization: query.specialization.trim().toLowerCase() });
  }

  if (typeof query.experienceLevel === 'string' && query.experienceLevel.trim()) {
    filters.push({ experienceLevel: query.experienceLevel.trim().toLowerCase() });
  }

  if (query.openToMentor === 'true' || query.openToMentor === true) {
    filters.push({ $or: [{ openToMentor: true }, { isInstructor: true }] });
  }

  return filters;
};

const getSuggestionScore = (candidate, currentUser) => {
  const currentTags = getComparableTechTags(currentUser);
  const candidateTags = getComparableTechTags(candidate);
  let overlap = 0;

  candidateTags.forEach((tag) => {
    if (currentTags.has(tag)) overlap += 1;
  });

  const mentorBoost = candidate.openToMentor || candidate.isInstructor ? 2 : 0;
  const ratingBoost = Number(candidate.rating || 0);
  const reputationBoost = Math.min(Number(candidate.reputationPoints || 0) / 100, 5);

  return overlap * 10 + mentorBoost + ratingBoost + reputationBoost;
};

// @desc    Search users
// @route   GET /api/users/search?q=query
// @access  Private
export const searchUsers = async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const discoveryFilters = buildDiscoveryFilters(req.query);

    if (q.length < 2 && discoveryFilters.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const searchTerm = escapeRegex(q.slice(0, 50));
    const followingIds = new Set((req.user.following || []).map(toIdString));
    const conditions = [{ _id: { $ne: req.user._id } }, ...discoveryFilters];

    if (q.length >= 2) {
      conditions.push({
        $or: [
          { username: { $regex: searchTerm, $options: 'i' } },
          { displayName: { $regex: searchTerm, $options: 'i' } },
          { specialization: { $regex: searchTerm, $options: 'i' } },
          { 'techStack.languages': { $regex: searchTerm, $options: 'i' } },
          { 'techStack.frameworks': { $regex: searchTerm, $options: 'i' } },
          { 'techStack.tools': { $regex: searchTerm, $options: 'i' } }
        ]
      });
    }

    const users = await User.find({
      $and: conditions
    })
      .select(userCardFields)
      .limit(20)
      .lean();

    // Add isFollowing field
    const usersWithFollowStatus = users.map((user) => ({
      ...user,
      isFollowing: followingIds.has(toIdString(user._id)),
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
      .select('-email -password')
      .populate('followers', userCardFields)
      .populate('following', userCardFields)
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUserId = toIdString(req.user._id);
    const followingIds = new Set((req.user.following || []).map(toIdString));

    // Check if current user follows this user
    const isFollowing = followingIds.has(toIdString(user._id));
    const decorateUser = (profileUser) => ({
      ...profileUser,
      isFollowing: followingIds.has(toIdString(profileUser._id)),
      isOwnProfile: sameId(profileUser._id, currentUserId)
    });

    res.status(200).json({
      success: true,
      data: {
        ...user,
        followers: (user.followers || []).map(decorateUser),
        following: (user.following || []).map(decorateUser),
        isFollowing,
        isOwnProfile: sameId(user._id, currentUserId)
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
    const targetUserId = req.params.id;

    if (!isValidObjectId(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id'
      });
    }

    // Can't follow yourself
    if (sameId(targetUserId, req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "You can't follow yourself"
      });
    }

    const userToFollow = await User.findById(targetUserId)
      .select('username displayName avatar')
      .lean();

    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const followResult = await User.updateOne(
      { _id: req.user._id, following: { $ne: userToFollow._id } },
      { $addToSet: { following: userToFollow._id } }
    );

    if (followResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'You are already following this user'
      });
    }

    await User.updateOne(
      { _id: userToFollow._id },
      { $addToSet: { followers: req.user._id } }
    );

    // Create notification
    await Notification.create({
      recipient: userToFollow._id,
      sender: req.user._id,
      type: 'follow',
      message: `${req.user.displayName} started following you`
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(userToFollow._id.toString()).emit('notification', {
        type: 'follow',
        sender: {
          _id: req.user._id,
          username: req.user.username,
          displayName: req.user.displayName,
          avatar: req.user.avatar
        },
        message: `${req.user.displayName} started following you`
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
    const targetUserId = req.params.id;

    if (!isValidObjectId(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id'
      });
    }

    if (sameId(targetUserId, req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "You can't unfollow yourself"
      });
    }

    const userToUnfollow = await User.findById(targetUserId).select('_id').lean();

    if (!userToUnfollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const unfollowResult = await User.updateOne(
      { _id: req.user._id, following: userToUnfollow._id },
      { $pull: { following: userToUnfollow._id } }
    );

    if (unfollowResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'You are not following this user'
      });
    }

    await User.updateOne(
      { _id: userToUnfollow._id },
      { $pull: { followers: req.user._id } }
    );

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
    const followingIds = (req.user.following || []).map(toIdString);
    const discoveryFilters = buildDiscoveryFilters(req.query);
    const currentUser = await User.findById(req.user._id)
      .select('skills techStack specialization')
      .lean();

    // Get users that current user is not following
    const users = await User.find({
      $and: [
        { _id: { $nin: [req.user._id, ...followingIds] } },
        ...discoveryFilters
      ]
    })
      .select(userCardFields)
      .limit(40)
      .sort({ createdAt: -1 })
      .lean();

    const usersWithCount = users
      .map((user) => ({
        ...user,
        isFollowing: false,
        followersCount: user.followers.length,
        suggestionScore: getSuggestionScore(user, currentUser)
      }))
      .sort((left, right) => right.suggestionScore - left.suggestionScore)
      .slice(0, 10)
      .map(({ suggestionScore, ...user }) => user);

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
