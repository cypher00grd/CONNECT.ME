import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import IssuePost from '../models/IssuePost.js';
import Room from '../models/Room.js';
import Ticket from '../models/Ticket.js';
import { evaluateTechBadges } from '../services/badgeService.js';
import { getIssueResolverCredit } from '../services/issuePaymentService.js';
import { getDomainForTag, normalizeTechTags } from '../data/techTaxonomy.js';

const sumField = (result) => Number(result?.[0]?.total || 0);

const applyNetCredit = (amount) => getIssueResolverCredit(amount);

const addTechCounts = (map, tags = [], weight = 1) => {
  normalizeTechTags(tags).forEach((tag) => {
    const domain = getDomainForTag(tag);
    const current = map.get(tag) || { tag, domain, count: 0 };
    current.count += weight;
    map.set(tag, current);
  });
};

const addSessionCount = (map, sessionType) => {
  const key = sessionType || 'open_discussion';
  map[key] = (map[key] || 0) + 1;
};

const toTimelineItem = (item) => ({
  kind: item.kind,
  title: item.title,
  status: item.status,
  date: item.resolvedAt || item.updatedAt || item.createdAt,
  tags: item.tags || [],
  sessionType: item.sessionType || 'open_discussion'
});

// @desc    Get current user's activity summary
// @route   GET /api/activity/me
// @access  Private
export const getMyActivity = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const [
      roomsJoined,
      roomsHosted,
      ticketsRaised,
      ticketsAccepted,
      liveSpentAgg,
      liveEarnedAgg,
      ticketSpentAgg,
      ticketEarnedAgg,
      issueSpentAgg,
      issueEarnedAgg,
      activityTickets,
      activityIssues,
      activityRooms
    ] = await Promise.all([
      Room.countDocuments({ creator: { $ne: userId }, 'participants.user': userId }),
      Room.countDocuments({ creator: userId }),
      Ticket.countDocuments({ requester: userId }),
      Ticket.countDocuments({ acceptedBy: userId }),
      Booking.aggregate([
        { $match: { user: userId, paymentStatus: 'paid' } },
        { $lookup: { from: 'rooms', localField: 'room', foreignField: '_id', as: 'room' } },
        { $unwind: '$room' },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$room.entryFee', 0] } } } }
      ]),
      Booking.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $lookup: { from: 'rooms', localField: 'room', foreignField: '_id', as: 'room' } },
        { $unwind: '$room' },
        { $match: { 'room.creator': userId } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$room.entryFee', 0] } } } }
      ]),
      Ticket.aggregate([
        { $match: { requester: userId, paymentStatus: 'captured' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$bountyAmount', 0] } } } }
      ]),
      Ticket.aggregate([
        { $match: { acceptedBy: userId, paymentStatus: 'captured' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$bountyAmount', 0] } } } }
      ]),
      IssuePost.aggregate([
        { $match: { poster: userId, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$bountyAmount', 0] } } } }
      ]),
      IssuePost.aggregate([
        { $match: { acceptedResolver: userId, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$bountyAmount', 0] } } } }
      ]),
      Ticket.find({
        $or: [
          { requester: userId },
          { acceptedBy: userId }
        ]
      })
        .select('title tags techStack sessionType status resolvedAt updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean(),
      IssuePost.find({
        $or: [
          { poster: userId },
          { acceptedResolver: userId }
        ]
      })
        .select('title tags techStack sessionType status resolvedAt updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean(),
      Room.find({
        $or: [
          { creator: userId },
          { 'participants.user': userId }
        ]
      })
        .select('title techTags category sessionType status endedAt updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean()
    ]);

    const ticketEarnedGross = sumField(ticketEarnedAgg);
    const issueEarnedGross = sumField(issueEarnedAgg);
    const summary = {
      roomsJoined,
      roomsHosted,
      ticketsRaised,
      ticketsAccepted,
      totalMoneySpent: sumField(liveSpentAgg) + sumField(ticketSpentAgg) + sumField(issueSpentAgg),
      totalMoneyEarned: sumField(liveEarnedAgg) + applyNetCredit(ticketEarnedGross) + applyNetCredit(issueEarnedGross)
    };
    const techCounts = new Map();
    const sessionStats = {};

    activityTickets.forEach((ticket) => {
      addTechCounts(techCounts, ticket.techStack?.length ? ticket.techStack : ticket.tags);
      addSessionCount(sessionStats, ticket.sessionType);
    });
    activityIssues.forEach((issue) => {
      addTechCounts(techCounts, issue.techStack?.length ? issue.techStack : issue.tags);
      addSessionCount(sessionStats, issue.sessionType);
    });
    activityRooms.forEach((room) => {
      addTechCounts(techCounts, room.techTags?.length ? room.techTags : [room.category]);
      addSessionCount(sessionStats, room.sessionType);
    });

    const techBreakdown = [...techCounts.values()]
      .sort((left, right) => right.count - left.count)
      .slice(0, 12);
    const timeline = [
      ...activityTickets.slice(0, 15).map((ticket) => toTimelineItem({
        kind: 'ticket',
        title: ticket.title,
        status: ticket.status,
        tags: ticket.techStack?.length ? ticket.techStack : ticket.tags,
        sessionType: ticket.sessionType,
        resolvedAt: ticket.resolvedAt,
        updatedAt: ticket.updatedAt,
        createdAt: ticket.createdAt
      })),
      ...activityIssues.slice(0, 15).map((issue) => toTimelineItem({
        kind: 'issue',
        title: issue.title,
        status: issue.status,
        tags: issue.techStack?.length ? issue.techStack : issue.tags,
        sessionType: issue.sessionType,
        resolvedAt: issue.resolvedAt,
        updatedAt: issue.updatedAt,
        createdAt: issue.createdAt
      })),
      ...activityRooms.slice(0, 15).map((room) => toTimelineItem({
        kind: 'room',
        title: room.title,
        status: room.status,
        tags: room.techTags?.length ? room.techTags : [room.category],
        sessionType: room.sessionType,
        resolvedAt: room.endedAt,
        updatedAt: room.updatedAt,
        createdAt: room.createdAt
      }))
    ]
      .sort((left, right) => new Date(right.date || 0) - new Date(left.date || 0))
      .slice(0, 20);
    const resolvedCount = activityTickets.filter((ticket) => ticket.status === 'resolved').length
      + activityIssues.filter((issue) => issue.status === 'resolved').length;
    const totalTracked = activityTickets.length + activityIssues.length;
    const developerStats = {
      techBreakdown,
      sessionStats,
      resolutionRate: totalTracked > 0 ? Math.round((resolvedCount / totalTracked) * 100) : 0,
      averageRatingByDomain: techBreakdown.slice(0, 5).map((item) => ({
        domain: item.domain,
        rating: Number(req.user.rating || 5)
      })),
      timeline,
      badges: evaluateTechBadges({
        user: req.user,
        summary,
        techBreakdown,
        sessionStats,
        timeline
      })
    };

    res.status(200).json({
      success: true,
      data: {
        ...summary,
        developerStats
      }
    });
  } catch (error) {
    next(error);
  }
};
