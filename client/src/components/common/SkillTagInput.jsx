import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';

const DEFAULT_SUGGESTIONS = [
  'react',
  'nodejs',
  'mongodb',
  'javascript',
  'python',
  'devops',
  'ui design',
  'stripe',
];

const normalizeTag = (tag) => (
  String(tag || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
);

const SkillTagInput = ({
  label = 'Skills',
  value = [],
  onChange,
  placeholder = 'Add a skill',
  max = 5,
  suggestions = DEFAULT_SUGGESTIONS,
  helperText,
}) => {
  const [draft, setDraft] = useState('');

  const tags = useMemo(() => (
    [...new Set((value || []).map(normalizeTag).filter(Boolean))].slice(0, max)
  ), [value, max]);

  const remainingSuggestions = suggestions.filter((suggestion) => !tags.includes(normalizeTag(suggestion)));
  const isFull = tags.length >= max;

  const commitTag = (tag) => {
    const normalized = normalizeTag(tag);
    if (!normalized || tags.includes(normalized) || isFull) return;
    onChange([...tags, normalized]);
    setDraft('');
  };

  const removeTag = (tag) => {
    onChange(tags.filter((item) => item !== tag));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitTag(draft);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
        </label>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isFull ? `Maximum ${max} selected` : placeholder}
          disabled={isFull}
          className="input-field"
        />
        <button
          type="button"
          onClick={() => commitTag(draft)}
          disabled={isFull || !draft.trim()}
          className="w-12 shrink-0 rounded-xl bg-primary-500 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Add skill"
        >
          <Plus size={18} />
        </button>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-300 text-sm font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-full hover:bg-primary-100 dark:hover:bg-primary-500/20"
                aria-label={`Remove ${tag}`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {remainingSuggestions.length > 0 && !isFull && (
        <div className="flex flex-wrap gap-2">
          {remainingSuggestions.slice(0, 6).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => commitTag(suggestion)}
              className="px-3 py-1 rounded-full bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-dark-700 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400">
        {helperText || `${tags.length}/${max} selected`}
      </p>
    </div>
  );
};

export default SkillTagInput;
