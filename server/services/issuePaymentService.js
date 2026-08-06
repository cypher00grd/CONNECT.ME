import Stripe from 'stripe';
import IssuePost from '../models/IssuePost.js';
import IssueRequest from '../models/IssueRequest.js';
import Room from '../models/Room.js';
import User from '../models/User.js';

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const toIdString = (value) => {
  if (!value) return '';
  return (value._id || value).toString();
};

export const getIssueResolverCredit = (bountyAmount) => {
  const amount = Number(bountyAmount || 0);
  if (amount <= 0) return 0;

  const feePercent = Number(process.env.PLATFORM_FEE_PERCENT || 10);
  return Math.max(0, amount - (amount * feePercent) / 100);
};

export const serializeIssue = (issue, requests = []) => {
  if (!issue) return null;
  const source = issue.toObject ? issue.toObject() : issue;

  return {
    _id: source._id,
    poster: source.poster,
    title: source.title,
    details: source.details,
    tags: source.tags || [],
    screenshots: source.screenshots || [],
    sessionType: source.sessionType || 'debugging',
    techStack: source.techStack || [],
    difficulty: source.difficulty || 'intermediate',
    repoUrl: source.repoUrl || '',
    errorContext: source.errorContext || '',
    bountyAmount: source.bountyAmount || 0,
    status: source.status,
    acceptedResolver: source.acceptedResolver || null,
    room: source.room || null,
    paymentStatus: source.paymentStatus,
    resolvedAt: source.resolvedAt || null,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    requests
  };
};

export const populateIssue = (query) => (
  query
    .populate('poster', 'username displayName avatar rating reviewsCount skills')
    .populate('acceptedResolver', 'username displayName avatar rating reviewsCount skills')
    .populate('room', 'title type status isVideoEnabled')
);

export const createIssueCheckoutSession = async ({ issue, poster }) => {
  const stripe = getStripe();
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const amount = Math.round(Number(issue.bountyAmount || 0) * 100);

  if (amount < 100) {
    throw new Error('Issue bounty amount must be at least ₹1');
  }

  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'inr',
          product_data: {
            name: `Issue Fix Bounty: ${issue.title}`,
            description: issue.details?.slice(0, 250) || 'Issue fix bounty'
          },
          unit_amount: amount
        },
        quantity: 1
      }
    ],
    success_url: `${clientUrl}/activity?issue_payment=success&issue=${issue._id}`,
    cancel_url: `${clientUrl}/activity?issue_payment=cancelled&issue=${issue._id}`,
    client_reference_id: poster._id.toString(),
    metadata: {
      kind: 'issue_bounty',
      issueId: issue._id.toString(),
      posterId: poster._id.toString(),
      resolverId: toIdString(issue.acceptedResolver)
    }
  }, {
    idempotencyKey: `issue-checkout:${issue._id}:${poster._id}`
  });
};

export const finalizeIssuePayment = async ({ io, session }) => {
  const issueId = session.metadata?.issueId;
  if (!issueId) return null;

  const issue = await IssuePost.findById(issueId);
  if (!issue || issue.paymentStatus === 'paid') return issue;

  issue.stripeCheckoutSessionId = session.id;
  issue.stripePaymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id || '';
  issue.paymentStatus = 'paid';
  issue.paymentPaidAt = new Date();
  issue.status = 'resolved';
  issue.resolvedAt = issue.resolvedAt || new Date();
  await issue.save();

  if (issue.acceptedResolver && issue.bountyAmount > 0) {
    await User.findByIdAndUpdate(issue.acceptedResolver, {
      $inc: {
        walletBalance: getIssueResolverCredit(issue.bountyAmount),
        reputationPoints: 15
      }
    });
  }

  await IssueRequest.updateMany(
    { issue: issue._id, status: 'pending' },
    { $set: { status: 'rejected' } }
  );

  if (issue.room) {
    await Room.findByIdAndUpdate(issue.room, {
      status: 'ended',
      endedAt: new Date()
    });
  }

  const populatedIssue = await populateIssue(IssuePost.findById(issue._id));
  const payload = serializeIssue(populatedIssue);

  [issue.poster, issue.acceptedResolver].map(toIdString).filter(Boolean).forEach((userId) => {
    io?.to(userId).emit('issue_resolved', { issue: payload });
  });

  if (issue.room) {
    io?.to(toIdString(issue.room)).emit('room_ended', {
      roomId: issue.room,
      message: 'The issue session has been marked fixed'
    });
  }

  return populatedIssue;
};
