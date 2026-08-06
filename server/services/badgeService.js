export const TECH_BADGE_DEFINITIONS = [
  {
    id: 'first_session',
    name: 'First Session',
    description: 'Completed your first help session',
    category: 'sessions',
    icon: 'rocket',
    target: 1
  },
  {
    id: 'react_expert',
    name: 'React Expert',
    description: 'Resolved 10+ React tickets or issues',
    category: 'expertise',
    icon: 'code',
    target: 10
  },
  {
    id: 'mentor_10',
    name: 'Mentor x 10',
    description: 'Helped 10 different developer sessions',
    category: 'mentorship',
    icon: 'users',
    target: 10
  },
  {
    id: 'code_reviewer',
    name: 'Code Reviewer',
    description: 'Completed 5+ code review sessions',
    category: 'expertise',
    icon: 'search',
    target: 5
  },
  {
    id: 'full_stack_hero',
    name: 'Full Stack Hero',
    description: 'Helped across 3+ tech domains',
    category: 'expertise',
    icon: 'layers',
    target: 3
  },
  {
    id: 'bounty_hunter',
    name: 'Bounty Hunter',
    description: 'Earned ₹5000+ in bounties',
    category: 'earnings',
    icon: 'banknote',
    target: 5000
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: '10+ sessions after midnight',
    category: 'consistency',
    icon: 'moon',
    target: 10
  },
  {
    id: 'streak_7',
    name: 'Weekly Warrior',
    description: '7-day active streak',
    category: 'consistency',
    icon: 'flame',
    target: 7
  }
];

const clampProgress = (value, target) => Math.max(0, Math.min(100, Math.round((value / target) * 100)));

const hasRecentSevenDayStreak = (timeline = []) => {
  const activeDays = new Set(
    timeline
      .map((item) => item.date || item.createdAt || item.resolvedAt)
      .filter(Boolean)
      .map((date) => new Date(date).toISOString().slice(0, 10))
  );

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const day = new Date();
    day.setDate(day.getDate() - dayOffset);
    if (!activeDays.has(day.toISOString().slice(0, 10))) return false;
  }

  return true;
};

export const evaluateTechBadges = ({
  user = {},
  summary = {},
  techBreakdown = [],
  sessionStats = {},
  timeline = []
} = {}) => {
  const savedBadges = new Set(user.badges || []);
  const techCounts = techBreakdown.reduce((map, item) => {
    map[item.tag] = Number(item.count || 0);
    return map;
  }, {});
  const helpedSessions = Number(summary.ticketsAccepted || 0) + Number(user.sessionsCompleted || 0) + Number(user.issuesResolved || 0);
  const domainsHelped = new Set(techBreakdown.map((item) => item.domain || item.tag).filter(Boolean)).size;
  const nightSessions = timeline.filter((item) => {
    const date = new Date(item.date || item.createdAt || item.resolvedAt || 0);
    const hour = date.getHours();
    return hour >= 0 && hour < 5;
  }).length;

  const progressById = {
    first_session: Number(summary.roomsJoined || 0) + Number(summary.roomsHosted || 0) + Number(summary.ticketsAccepted || 0),
    react_expert: techCounts.react || 0,
    mentor_10: helpedSessions,
    code_reviewer: Number(sessionStats.code_review || user.codeReviewsGiven || 0),
    full_stack_hero: domainsHelped,
    bounty_hunter: Number(summary.totalMoneyEarned || 0),
    night_owl: nightSessions,
    streak_7: hasRecentSevenDayStreak(timeline) ? 7 : Math.min(new Set(timeline.map((item) => (
      new Date(item.date || item.createdAt || item.resolvedAt || 0).toISOString().slice(0, 10)
    ))).size, 7)
  };

  return TECH_BADGE_DEFINITIONS.map((badge) => {
    const value = progressById[badge.id] || 0;
    const earned = savedBadges.has(badge.id) || value >= badge.target;

    return {
      ...badge,
      earned,
      progress: clampProgress(value, badge.target),
      value
    };
  });
};
