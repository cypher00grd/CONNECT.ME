import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Code2, CreditCard, GitBranch, Layers3, LifeBuoy, UserCheck, Video, XCircle } from 'lucide-react';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import { formatRelativeTime } from '../../utils/helpers';
import { HELP_SESSION_TYPES, ROOM_DIFFICULTIES } from '../../utils/constants';

const statusStyles = {
  payment_pending: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  searching: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  direct_pending: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  locked: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  in_progress: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  accepted: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  resolved: 'bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-300',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

const getId = (value) => String(value?._id || value || '');

const getRoomId = (ticket) => getId(ticket?.room);
const getOptionLabel = (options, value, fallback) => (
  options.find((option) => option.value === value)?.label || fallback
);

const TicketCard = ({
  ticket,
  currentUserId,
  onLock,
  onApprove,
  onReject,
  onCancel,
  onResolve,
  onRefreshPayment,
  isBusy = false,
  compact = false,
}) => {
  if (!ticket) return null;

  const requester = ticket.requester || {};
  const helper = ticket.acceptedBy || ticket.lockedBy || ticket.targetHelper;
  const isRequester = getId(requester) === currentUserId;
  const isHelper = getId(helper) === currentUserId;
  const roomId = getRoomId(ticket);
  const canLock = !isRequester && ['searching', 'direct_pending'].includes(ticket.status);
  const canReview = isRequester && ticket.status === 'locked' && ticket.lockedBy;
  const canCancel = isRequester && ['payment_pending', 'searching', 'direct_pending', 'locked', 'in_progress', 'accepted'].includes(ticket.status);
  const canResolve = isRequester && ['in_progress', 'accepted'].includes(ticket.status);
  const canRefreshPayment = isRequester && ticket.status === 'payment_pending' && ticket.bountyAmount > 0;

  return (
    <article className={`card p-4 ${compact ? 'space-y-3' : 'space-y-4'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            src={requester.avatar}
            name={requester.displayName || 'Requester'}
            size={compact ? 'md' : 'lg'}
          />
          <div className="min-w-0">
            <h3 className="font-display font-bold text-gray-900 dark:text-white line-clamp-1 tracking-tight">
              {ticket.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              @{requester.username || 'requester'} · {formatRelativeTime(ticket.createdAt)}
            </p>
          </div>
        </div>

        <span className={`shrink-0 badge ${statusStyles[ticket.status] || statusStyles.searching}`}>
          {ticket.status?.replace('_', ' ')}
        </span>
      </div>

      {!compact && (
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
          {ticket.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-800 font-medium">
          <Code2 size={14} />
          {getOptionLabel(HELP_SESSION_TYPES, ticket.sessionType, 'Debugging')}
        </span>
        {ticket.difficulty && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-800 font-medium">
            <Layers3 size={14} />
            {getOptionLabel(ROOM_DIFFICULTIES, ticket.difficulty, ticket.difficulty)}
          </span>
        )}
        {ticket.repoUrl && (
          <a
            href={ticket.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-800 font-medium hover:text-primary-500"
          >
            <GitBranch size={14} />
            Repository
          </a>
        )}
      </div>

      {!compact && ticket.errorContext && (
        <div className="rounded-xl border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Error context
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap line-clamp-4">
            {ticket.errorContext}
          </p>
        </div>
      )}

      {ticket.screenshots?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ticket.screenshots.slice(0, compact ? 2 : 3).map((screenshot) => (
            <a
              key={screenshot.url}
              href={screenshot.url}
              target="_blank"
              rel="noreferrer"
              className="relative block rounded-xl overflow-hidden border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900 group"
            >
              <img
                src={screenshot.url}
                alt={screenshot.name || 'Ticket screenshot'}
                className="h-24 w-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 px-2 py-1 bg-black/65 text-[11px] text-white truncate">
                Click to view
              </span>
            </a>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(ticket.techStack || []).map((tag) => (
          <span
            key={`tech-${tag}`}
            className="px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-500/10 text-xs font-medium text-primary-600 dark:text-primary-300"
          >
            {tag}
          </span>
        ))}
        {(ticket.tags || []).map((tag) => (
          <span
            key={tag}
            className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-800 text-xs font-medium text-gray-600 dark:text-gray-300"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-800 text-xs font-medium uppercase tracking-wide">
          {ticket.visibility === 'direct' ? 'Direct' : 'Public'}
        </span>
        <span className="flex items-center gap-1.5">
          <LifeBuoy size={15} />
          {ticket.bountyAmount > 0 ? `₹${ticket.bountyAmount}` : 'Free'}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={15} />
          {ticket.estimatedMinutes || 30} min
        </span>
        {ticket.paymentStatus && ticket.paymentStatus !== 'not_required' && (
          <span className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-300 text-xs font-medium">
            {ticket.paymentStatus.replace('_', ' ')}
          </span>
        )}
        {ticket.lockExpiresAt && ticket.status === 'locked' && (
          <span className="flex items-center gap-1.5">
            <Clock size={15} />
            Review pending
          </span>
        )}
        {helper?.displayName && (
          <span className="flex items-center gap-1.5">
            <UserCheck size={15} />
            {isHelper ? 'You' : helper.displayName}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {canLock && (
          <Button
            size="sm"
            leftIcon={<UserCheck size={16} />}
            onClick={() => onLock?.(ticket)}
            isLoading={isBusy}
          >
            Accept
          </Button>
        )}

        {canReview && (
          <>
            {ticket.lockedBy?.username && (
              <Link to={`/profile/${ticket.lockedBy.username}`}>
                <Button size="sm" variant="secondary" leftIcon={<UserCheck size={16} />}>
                  View Profile
                </Button>
              </Link>
            )}
            <Button
              size="sm"
              variant="success"
              leftIcon={<CheckCircle2 size={16} />}
              onClick={() => onApprove?.(ticket)}
              isLoading={isBusy}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<XCircle size={16} />}
              onClick={() => onReject?.(ticket)}
              disabled={isBusy}
            >
              Pass
            </Button>
          </>
        )}

        {roomId && (
          <Link to={`/room/${roomId}`}>
            <Button size="sm" variant="secondary" leftIcon={<Video size={16} />}>
              Open Room
            </Button>
          </Link>
        )}

        {canResolve && (
          <Button
            size="sm"
            variant="success"
            leftIcon={<CheckCircle2 size={16} />}
            onClick={() => onResolve?.(ticket)}
            isLoading={isBusy}
          >
            Resolve
          </Button>
        )}

        {canRefreshPayment && (
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<CreditCard size={16} />}
            onClick={() => onRefreshPayment?.(ticket)}
            isLoading={isBusy}
          >
            Continue payment
          </Button>
        )}

        {canCancel && (
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:text-red-600"
            onClick={() => onCancel?.(ticket)}
            disabled={isBusy}
          >
            Cancel
          </Button>
        )}
      </div>
    </article>
  );
};

export default TicketCard;
