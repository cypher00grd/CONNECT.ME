import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Code2, Eye, GitBranch, IndianRupee, Layers3, MessageSquare, Send, UserCheck, XCircle } from 'lucide-react';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { formatRelativeTime } from '../../utils/helpers';
import { HELP_SESSION_TYPES, ROOM_DIFFICULTIES } from '../../utils/constants';

const getId = (value) => String(value?._id || value || '');
const getOptionLabel = (options, value, fallback) => (
  options.find((option) => option.value === value)?.label || fallback
);

const statusStyles = {
  open: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  in_progress: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  resolved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

const IssueCard = ({
  issue,
  currentUserId,
  mode = 'feed',
  onRequest,
  onApproveRequest,
  onRejectRequest,
  onResolve,
  isBusy = false,
}) => {
  const [requestOpen, setRequestOpen] = useState(false);
  const [message, setMessage] = useState('');
  if (!issue) return null;

  const poster = issue.poster || {};
  const acceptedResolver = issue.acceptedResolver || {};
  const isPoster = getId(poster) === currentUserId;
  const isResolver = getId(acceptedResolver) === currentUserId;
  const roomId = getId(issue.room);
  const pendingRequests = (issue.requests || []).filter((request) => request.status === 'pending');

  const submitRequest = async () => {
    await onRequest?.(issue, message);
    setMessage('');
    setRequestOpen(false);
  };

  return (
    <article className="card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            src={poster.avatar}
            name={poster.displayName || 'Issue poster'}
            size="lg"
          />
          <div className="min-w-0">
            <h3 className="font-display font-bold text-gray-900 dark:text-white line-clamp-1 tracking-tight">
              {issue.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              @{poster.username || 'poster'} · {formatRelativeTime(issue.createdAt)}
            </p>
          </div>
        </div>
        <span className={`shrink-0 badge ${statusStyles[issue.status] || statusStyles.open}`}>
          {issue.status?.replace('_', ' ')}
        </span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap line-clamp-4">
        {issue.details}
      </p>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-800 font-medium">
          <Code2 size={14} />
          {getOptionLabel(HELP_SESSION_TYPES, issue.sessionType, 'Debugging')}
        </span>
        {issue.difficulty && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-800 font-medium">
            <Layers3 size={14} />
            {getOptionLabel(ROOM_DIFFICULTIES, issue.difficulty, issue.difficulty)}
          </span>
        )}
        {issue.repoUrl && (
          <a
            href={issue.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-800 font-medium hover:text-primary-500"
          >
            <GitBranch size={14} />
            Repository
          </a>
        )}
      </div>

      {issue.errorContext && (
        <div className="rounded-xl border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Error context
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap line-clamp-4">
            {issue.errorContext}
          </p>
        </div>
      )}

      {issue.screenshots?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {issue.screenshots.slice(0, 3).map((screenshot) => (
            <a
              key={screenshot.url}
              href={screenshot.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl overflow-hidden border border-gray-200 dark:border-dark-700"
            >
              <img src={screenshot.url} alt={screenshot.name || 'Issue screenshot'} className="h-24 w-full object-cover" />
            </a>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(issue.techStack || []).map((tag) => (
          <span
            key={`tech-${tag}`}
            className="px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-500/10 text-xs font-medium text-primary-600 dark:text-primary-300"
          >
            {tag}
          </span>
        ))}
        {(issue.tags || []).map((tag) => (
          <span
            key={tag}
            className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-800 text-xs font-medium text-gray-600 dark:text-gray-300"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <IndianRupee size={15} />
          {issue.bountyAmount > 0 ? `₹${issue.bountyAmount}` : 'Free'}
        </span>
        {issue.paymentStatus && issue.paymentStatus !== 'not_required' && (
          <span className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-300 text-xs font-medium">
            {issue.paymentStatus.replace('_', ' ')}
          </span>
        )}
        {acceptedResolver?.displayName && (
          <span className="flex items-center gap-1.5">
            <UserCheck size={15} />
            {isResolver ? 'You' : acceptedResolver.displayName}
          </span>
        )}
      </div>

      {mode === 'my' && isPoster && pendingRequests.length > 0 && (
        <div className="space-y-2 border-t border-gray-100 dark:border-dark-800 pt-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Requests
          </p>
          {pendingRequests.map((request) => (
            <div
              key={request._id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-gray-50 dark:bg-dark-900/60 border border-gray-100 dark:border-dark-800 p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar src={request.resolver?.avatar} name={request.resolver?.displayName} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {request.resolver?.displayName || 'Resolver'}
                  </p>
                  {request.message && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {request.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {request.resolver?.username && (
                  <Link to={`/profile/${request.resolver.username}`}>
                    <Button size="sm" variant="secondary" leftIcon={<Eye size={15} />}>
                      Profile
                    </Button>
                  </Link>
                )}
                <Button
                  size="sm"
                  variant="success"
                  leftIcon={<CheckCircle2 size={15} />}
                  onClick={() => onApproveRequest?.(issue, request)}
                  isLoading={isBusy}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<XCircle size={15} />}
                  onClick={() => onRejectRequest?.(issue, request)}
                  disabled={isBusy}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {mode === 'feed' && !issue.requestedByMe && (
          <Button
            size="sm"
            leftIcon={<Send size={16} />}
            onClick={() => setRequestOpen(true)}
            disabled={isBusy}
          >
            Request to Help
          </Button>
        )}
        {mode === 'feed' && issue.requestedByMe && (
          <span className="badge bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
            request sent
          </span>
        )}
        {roomId && (
          <Link to={`/room/${roomId}`}>
            <Button size="sm" variant="secondary" leftIcon={<MessageSquare size={16} />}>
              Open Session
            </Button>
          </Link>
        )}
        {isPoster && issue.status === 'in_progress' && (
          <Button
            size="sm"
            variant="success"
            leftIcon={<CheckCircle2 size={16} />}
            onClick={() => onResolve?.(issue)}
            isLoading={isBusy}
          >
            Issue Fixed
          </Button>
        )}
      </div>

      <Modal
        isOpen={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request to Help"
        size="md"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Send a short note so the poster can decide if you are a good fit.
          </p>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            maxLength={500}
            className="input-field resize-none"
            placeholder="I can help debug this. I have worked with similar issues..."
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button type="button" leftIcon={<Send size={16} />} onClick={submitRequest} isLoading={isBusy}>
              Send Request
            </Button>
          </div>
        </div>
      </Modal>
    </article>
  );
};

export default IssueCard;
