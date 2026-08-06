import { memo } from 'react';
import Avatar from '../common/Avatar';
import { formatMessageTime } from '../../utils/helpers';
import useAuth from '../../hooks/useAuth';
import CodeBlock from './CodeBlock';

const parseContentBlocks = (content = '') => {
  const blocks = [];
  const codeRegex = /```([a-zA-Z0-9+#.-]*)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }

    blocks.push({
      type: 'code',
      language: match[1] || 'text',
      value: match[2] || '',
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    blocks.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return blocks.length > 0 ? blocks : [{ type: 'text', value: content }];
};

const MessageItem = memo(({ message, showAvatar = true }) => {
  const { userId } = useAuth();

  const {
    sender = {},
    content = "",
    createdAt,
    type = "text",
    attachments = [],
  } = message || {};

  const isOwnMessage = sender?._id === userId;
  const isSystemMessage = type === "system";

  // System messages (join/leave/room ended)
  if (isSystemMessage) {
    return (
      <div className="flex justify-center my-2">
        <span className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark-700 rounded-full">
          {content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 mb-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      
      {/* Avatar */}
      {showAvatar && !isOwnMessage ? (
        <Avatar
          src={sender?.avatar}
          name={sender?.displayName}
          size="sm"
          className="flex-shrink-0 mt-1"
        />
      ) : (
        <div className="w-8" />
      )}

      {/* Message bubble */}
      <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        
        {/* Sender Name */}
        {showAvatar && !isOwnMessage && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
            {sender?.displayName || "Unknown User"}
          </p>
        )}

        {/* Bubble */}
        <div
          className={`
            px-4 py-2.5 rounded-2xl break-words whitespace-pre-wrap space-y-2
            ${isOwnMessage
              ? 'bg-primary-500 text-white rounded-br-md'
              : 'bg-gray-100 dark:bg-dark-700 text-gray-900 dark:text-white rounded-bl-md'}
          `}
        >
          {attachments.length > 0 && (
            <div className="grid gap-2">
              {attachments.map((attachment) => (
                <a
                  key={attachment.url}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-xl border border-white/20"
                >
                  <img
                    src={attachment.url}
                    alt={attachment.name || 'Message attachment'}
                    className="max-h-64 w-full object-cover"
                  />
                </a>
              ))}
            </div>
          )}
          {content && (
            <div className="space-y-2 text-sm">
              {parseContentBlocks(content).map((block, index) => (
                block.type === 'code' ? (
                  <CodeBlock
                    key={`${message._id || createdAt}-code-${index}`}
                    code={block.value}
                    language={block.language}
                  />
                ) : (
                  <p key={`${message._id || createdAt}-text-${index}`}>
                    {block.value}
                  </p>
                )
              ))}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p
          className={`text-xs text-gray-400 mt-1 ${
            isOwnMessage ? 'text-right mr-1' : 'ml-1'
          }`}
        >
          {formatMessageTime(createdAt)}
        </p>
      </div>
    </div>
  );
});

MessageItem.displayName = "MessageItem";

export default MessageItem;
