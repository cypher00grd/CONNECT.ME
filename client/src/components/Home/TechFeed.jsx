import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Code2, GitPullRequest, Radio, Users } from 'lucide-react';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import { HELP_SESSION_TYPES } from '../../utils/constants';

const normalize = (value) => String(value || '').trim().toLowerCase();

const getStackTags = (user = {}) => [
  ...(user.skills || []),
  ...(user.techStack?.languages || []),
  ...(user.techStack?.frameworks || []),
  ...(user.techStack?.tools || []),
  user.specialization,
].map(normalize).filter(Boolean);

const getLabel = (value) => HELP_SESSION_TYPES.find((type) => type.value === value)?.label || value || 'Session';

const tagScore = (items = []) => {
  const counts = new Map();
  items.flat().map(normalize).filter(Boolean).forEach((tag) => {
    counts.set(tag, (counts.get(tag) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);
};

const TechFeed = ({ rooms = [], issues = [], developers = [], user = {} }) => {
  const userTags = new Set(getStackTags(user));
  const liveSessions = rooms.filter((room) => room.status === 'active' || room.status === 'scheduled');
  const matchingSessions = liveSessions.filter((room) => (
    (room.techTags || []).some((tag) => userTags.has(normalize(tag)))
    || userTags.has(normalize(room.category))
  ));
  const matchingIssues = issues.filter((issue) => (
    [...(issue.techStack || []), ...(issue.tags || [])].some((tag) => userTags.has(normalize(tag)))
  ));
  const trendingTags = tagScore([
    ...rooms.map((room) => room.techTags?.length ? room.techTags : [room.category]),
    ...issues.map((issue) => issue.techStack?.length ? issue.techStack : issue.tags),
    getStackTags(user),
  ]);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Matching sessions</p>
          <p className="mt-1 text-2xl font-display font-bold text-gray-900 dark:text-white">
            {matchingSessions.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Open issues</p>
          <p className="mt-1 text-2xl font-display font-bold text-gray-900 dark:text-white">
            {matchingIssues.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Stack tags</p>
          <p className="mt-1 text-2xl font-display font-bold text-gray-900 dark:text-white">
            {userTags.size}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Developers</p>
          <p className="mt-1 text-2xl font-display font-bold text-gray-900 dark:text-white">
            {developers.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Radio size={18} className="text-primary-500" />
              Stack Sessions
            </h3>
            <Link to="/explore" className="text-sm font-semibold text-primary-500">
              View
            </Link>
          </div>
          {matchingSessions.slice(0, 3).map((room) => (
            <Link key={room._id} to={`/room/${room._id}`} className="block rounded-xl border border-gray-100 dark:border-dark-800 p-3 hover:border-primary-300 dark:hover:border-primary-500/50 transition-colors">
              <p className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">{room.title}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {getLabel(room.sessionType)} · {room.status}
              </p>
            </Link>
          ))}
          {matchingSessions.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No sessions match your stack yet.</p>
          )}
        </div>

        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <GitPullRequest size={18} className="text-primary-500" />
              Open Issues
            </h3>
            <Link to="/explore" className="text-sm font-semibold text-primary-500">
              Browse
            </Link>
          </div>
          {matchingIssues.slice(0, 3).map((issue) => (
            <Link key={issue._id} to="/explore" className="block rounded-xl border border-gray-100 dark:border-dark-800 p-3 hover:border-primary-300 dark:hover:border-primary-500/50 transition-colors">
              <p className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">{issue.title}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {getLabel(issue.sessionType)} · {issue.bountyAmount > 0 ? `₹${issue.bountyAmount}` : 'Free'}
              </p>
            </Link>
          ))}
          {matchingIssues.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No open issues match your stack yet.</p>
          )}
        </div>

        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={18} className="text-primary-500" />
              Matching Developers
            </h3>
            <Link to="/explore" className="text-sm font-semibold text-primary-500">
              Find
            </Link>
          </div>
          {developers.slice(0, 3).map((developer) => (
            <Link key={developer._id} to={`/profile/${developer.username}`} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-dark-800 p-3 hover:border-primary-300 dark:hover:border-primary-500/50 transition-colors">
              <Avatar src={developer.avatar} name={developer.displayName} size="sm" />
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{developer.displayName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {developer.specialization || developer.experienceLevel || 'developer'}
                </p>
              </div>
            </Link>
          ))}
          {developers.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No matching developers yet.</p>
          )}
        </div>
      </div>

      {trendingTags.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity size={18} className="text-primary-500" />
              Trending Tech
            </h3>
            <Link to="/explore">
              <Button size="sm" variant="secondary" rightIcon={<ArrowRight size={15} />}>
                Explore
              </Button>
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {trendingTags.map((tag) => (
              <span key={tag.tag} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-300 text-sm font-semibold">
                <Code2 size={14} />
                {tag.tag}
                <span className="text-xs opacity-70">{tag.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default TechFeed;
