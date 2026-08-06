import { Award, Banknote, Code2, Flame, Layers3, Moon, Rocket, Search, Users } from 'lucide-react';

const iconMap = {
  award: Award,
  banknote: Banknote,
  code: Code2,
  flame: Flame,
  layers: Layers3,
  moon: Moon,
  rocket: Rocket,
  search: Search,
  users: Users,
};

const normalizeBadge = (badge) => {
  if (typeof badge !== 'string') return badge;
  return {
    id: badge,
    name: badge.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    description: 'Earned developer badge',
    icon: 'award',
    earned: true,
    progress: 100,
    value: 1,
    target: 1,
  };
};

const BadgeGrid = ({ badges = [], compact = false }) => {
  const normalizedBadges = badges.map(normalizeBadge).filter(Boolean);

  if (!normalizedBadges.length) return null;

  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'}`}>
      {normalizedBadges.map((badge) => {
        const Icon = iconMap[badge.icon] || Award;
        return (
          <div
            key={badge.id}
            className={`rounded-xl border p-4 transition-colors ${
              badge.earned
                ? 'border-primary-200 dark:border-primary-500/40 bg-primary-50 dark:bg-primary-500/10'
                : 'border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-900/60'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                badge.earned
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-dark-800 text-gray-500 dark:text-gray-400'
              }`}
              >
                <Icon size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-display font-bold text-sm text-gray-900 dark:text-white truncate">
                    {badge.name}
                  </p>
                  {badge.earned && (
                    <span className="shrink-0 rounded-full bg-primary-500/10 px-2 py-0.5 text-[11px] font-semibold text-primary-600 dark:text-primary-300">
                      earned
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {badge.description}
                </p>
              </div>
            </div>

            {!badge.earned && (
              <div className="mt-3">
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-dark-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-500"
                    style={{ width: `${badge.progress || 0}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {badge.value || 0}/{badge.target}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BadgeGrid;
