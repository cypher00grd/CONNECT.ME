import User from '../models/User.js';

const clampRating = (value) => Math.min(5, Math.max(1, Number(value.toFixed(2))));

export const calculateDisplayedRating = (user) => {
  const ratingTotal = Number(user.ratingTotal || 0);
  const ratingCount = Number(user.ratingCount || user.reviewsCount || 0);
  const penaltyPoints = Number(user.penaltyPoints || 0);
  const value = ((5 * 5) + ratingTotal - penaltyPoints) / (5 + ratingCount);
  return clampRating(value);
};

export const applyUserReview = async (userId, stars, reputationDelta = 0) => {
  const user = await User.findById(userId);
  if (!user) return null;

  user.ratingTotal = Number(user.ratingTotal || 0) + stars;
  user.ratingCount = Number(user.ratingCount || 0) + 1;
  user.reviewsCount = user.ratingCount;
  user.reputationPoints = Number(user.reputationPoints || 0) + reputationDelta;
  user.rating = calculateDisplayedRating(user);
  await user.save();
  return user;
};

export const applyEarlyExitPenalty = async (userId, role) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const isHelper = role === 'helper';
  user.penaltyPoints = Number(user.penaltyPoints || 0) + (isHelper ? 0.5 : 0.25);
  user.reputationPoints = Number(user.reputationPoints || 0) + (isHelper ? -20 : -10);
  user.earlyExitCount = Number(user.earlyExitCount || 0) + 1;
  user.rating = calculateDisplayedRating(user);
  await user.save();
  return user;
};

export const creditHelperForTicket = async (helperId, bountyAmount) => {
  const amount = Number(bountyAmount || 0);
  if (!helperId || amount <= 0) return null;

  const feePercent = Number(process.env.PLATFORM_FEE_PERCENT || 10);
  const credit = Math.max(0, amount - (amount * feePercent) / 100);

  return User.findByIdAndUpdate(
    helperId,
    {
      $inc: {
        walletBalance: credit,
        completedTickets: 1,
        reputationPoints: 15
      }
    },
    { new: true }
  );
};

