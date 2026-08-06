import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

const CodeBlock = ({ code = '', language = 'text', title = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-dark-700 bg-gray-950 text-gray-100">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2 text-xs">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">
            {title || language || 'code'}
          </p>
          {title && language && (
            <p className="truncate text-gray-400">
              {language}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-gray-200 hover:bg-white/15"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="max-h-80 overflow-auto p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;
