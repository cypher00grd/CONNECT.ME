import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Banknote, Code2, GitPullRequest, LifeBuoy, Radio, Send, Ticket, TrendingUp, Users } from 'lucide-react';
import EmptyState from '../components/common/EmptyState';
import IssueCard from '../components/Issues/IssueCard';
import BadgeGrid from '../components/Profile/BadgeGrid';
import { getMyActivity } from '../redux/Slices/activitySlice';
import {
  approveIssueRequest,
  getMyIssues,
  rejectIssueRequest,
  resolveIssue
} from '../redux/Slices/issueSlice';

const formatMoney = (amount) => `₹${Math.round(Number(amount || 0))}`;

const getId = (value) => String(value?._id || value || '');
const formatSessionLabel = (value) => String(value || 'open_discussion').replace(/_/g, ' ');
const formatTimelineDate = (value) => (
  value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''
);

const Activity = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth);
  const { summary, isLoading } = useSelector((state) => state.activity);
  const { myIssues, actionIssueId } = useSelector((state) => state.issues);

  useEffect(() => {
    dispatch(getMyActivity());
    dispatch(getMyIssues());
  }, [dispatch]);

  useEffect(() => {
    const issuePaymentStatus = searchParams.get('issue_payment');
    if (!issuePaymentStatus) return;

    if (issuePaymentStatus === 'success') {
      toast.success('Issue bounty paid. Session marked fixed.');
    }

    if (issuePaymentStatus === 'cancelled') {
      toast.error('Issue bounty payment cancelled.');
    }

    dispatch(getMyActivity());
    dispatch(getMyIssues());
    setSearchParams({}, { replace: true });
  }, [dispatch, searchParams, setSearchParams]);

  const stats = [
    { label: 'Rooms joined', value: summary.roomsJoined, icon: Users },
    { label: 'Rooms hosted', value: summary.roomsHosted, icon: Radio },
    { label: 'Tickets raised', value: summary.ticketsRaised, icon: Ticket },
    { label: 'Tickets accepted', value: summary.ticketsAccepted, icon: LifeBuoy },
    { label: 'Money spent', value: formatMoney(summary.totalMoneySpent), icon: Send },
    { label: 'Money earned', value: formatMoney(summary.totalMoneyEarned), icon: Banknote },
  ];
  const developerStats = summary.developerStats || {};
  const techBreakdown = developerStats.techBreakdown || [];
  const sessionStats = developerStats.sessionStats || {};
  const sessionEntries = Object.entries(sessionStats).sort((left, right) => right[1] - left[1]).slice(0, 6);
  const badges = developerStats.badges || [];
  const timeline = developerStats.timeline || [];

  const postedIssues = myIssues.filter((issue) => getId(issue.poster) === user?._id);
  const resolverIssues = myIssues.filter((issue) => getId(issue.acceptedResolver) === user?._id);

  const runIssueAction = async (action, successMessage) => {
    try {
      const result = await dispatch(action).unwrap();
      if (successMessage) toast.success(successMessage);
      dispatch(getMyActivity());
      dispatch(getMyIssues());
      return result;
    } catch (error) {
      toast.error(error || 'Issue action failed');
      return null;
    }
  };

  const handleApproveRequest = async (issue, request) => {
    const result = await runIssueAction(
      approveIssueRequest({ issueId: issue._id, requestId: request._id }),
      'Private session created'
    );
    const roomId = getId(result?.room);
    if (roomId) navigate(`/room/${roomId}`);
  };

  const handleRejectRequest = async (issue, request) => {
    await runIssueAction(
      rejectIssueRequest({ issueId: issue._id, requestId: request._id }),
      'Request rejected'
    );
  };

  const handleResolveIssue = async (issue) => {
    if (!window.confirm('Mark this issue as fixed?')) return;
    const result = await runIssueAction(resolveIssue(issue._id), issue.bountyAmount > 0 ? '' : 'Issue resolved');
    if (result?.payment?.url) {
      toast.success('Redirecting to Stripe to pay the bounty');
      window.location.href = result.payment.url;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white tracking-tight">
          My Activity
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Your rooms, tickets, issue sessions, and settled money.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-display font-bold text-gray-900 dark:text-white mt-1">
                    {isLoading ? '-' : stat.value}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-500 flex items-center justify-center">
                  <Icon size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {badges.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">
            Developer Badges
          </h2>
          <BadgeGrid badges={badges} />
        </section>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-4 xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Code2 size={19} className="text-primary-500" />
              Sessions by Tech Stack
            </h2>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {developerStats.resolutionRate || 0}% resolved
            </span>
          </div>
          {techBreakdown.length > 0 ? (
            <div className="mt-4 space-y-3">
              {techBreakdown.slice(0, 8).map((item) => (
                <div key={item.tag}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">{item.tag}</span>
                    <span className="text-gray-500 dark:text-gray-400">{item.count}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-gray-100 dark:bg-dark-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: `${Math.min(100, item.count * 12)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Tech stats appear after rooms, tickets, or issues have tags.
            </p>
          )}
        </div>

        <div className="card p-4">
          <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={19} className="text-primary-500" />
            Session Mix
          </h2>
          {sessionEntries.length > 0 ? (
            <div className="mt-4 space-y-2">
              {sessionEntries.map(([sessionType, count]) => (
                <div key={sessionType} className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-dark-900/70 px-3 py-2">
                  <span className="text-sm font-semibold capitalize text-gray-700 dark:text-gray-200">
                    {formatSessionLabel(sessionType)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Session mix appears after your first developer activity.
            </p>
          )}
        </div>
      </section>

      {timeline.length > 0 && (
        <section className="card p-4">
          <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GitPullRequest size={19} className="text-primary-500" />
            Contribution Timeline
          </h2>
          <div className="mt-4 divide-y divide-gray-100 dark:divide-dark-800">
            {timeline.slice(0, 8).map((item, index) => (
              <div key={`${item.kind}-${item.title}-${index}`} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {item.kind} · {formatSessionLabel(item.sessionType)} · {item.status}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                  {formatTimelineDate(item.date)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">
            Posted Issues
          </h2>
          <Link to="/explore" className="text-sm font-medium text-primary-500 hover:text-primary-600">
            Explore issues
          </Link>
        </div>
        {postedIssues.length > 0 ? (
          <div className="grid gap-3">
            {postedIssues.map((issue) => (
              <IssueCard
                key={issue._id}
                issue={issue}
                currentUserId={user?._id}
                mode="my"
                onApproveRequest={handleApproveRequest}
                onRejectRequest={handleRejectRequest}
                onResolve={handleResolveIssue}
                isBusy={actionIssueId === issue._id}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<LifeBuoy size={32} />}
            title="No posted issues"
            description="Issues you post will appear here with resolver requests."
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">
          Accepted Issue Sessions
        </h2>
        {resolverIssues.length > 0 ? (
          <div className="grid gap-3">
            {resolverIssues.map((issue) => (
              <IssueCard
                key={issue._id}
                issue={issue}
                currentUserId={user?._id}
                mode="my"
                isBusy={actionIssueId === issue._id}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Users size={32} />}
            title="No accepted issue sessions"
            description="When a poster approves you, the private session appears here."
          />
        )}
      </section>
    </div>
  );
};

export default Activity;
