export const CATEGORIES = [
  { value: 'frontend', label: 'Frontend', emoji: '🖥️', color: 'blue' },
  { value: 'backend', label: 'Backend', emoji: '⚙️', color: 'green' },
  { value: 'fullstack', label: 'Full Stack', emoji: '🔗', color: 'purple' },
  { value: 'devops', label: 'DevOps', emoji: '🚀', color: 'orange' },
  { value: 'mobile', label: 'Mobile', emoji: '📱', color: 'pink' },
  { value: 'data_ml', label: 'Data / ML', emoji: '🧠', color: 'yellow' },
  { value: 'system_design', label: 'System Design', emoji: '🏗️', color: 'amber' },
  { value: 'security', label: 'Security', emoji: '🔒', color: 'red' },
  { value: 'dsa', label: 'DSA', emoji: '🧩', color: 'emerald' },
  { value: 'other', label: 'Other', emoji: '💡', color: 'gray' },
];

export const CATEGORY_BY_VALUE = CATEGORIES.reduce((acc, category) => {
  acc[category.value] = category;
  return acc;
}, {});

export const AUTO_DELETE_OPTIONS = [
  { value: null, label: 'No auto-delete' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 360, label: '6 hours' },
  { value: 1440, label: '24 hours' },
];

export const REACTIONS = ['❤️', '🔥', '👏', '😂', '😮', '🎉', '💯', '✨'];

export const CATEGORY_COLORS = {
  frontend: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  backend: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  fullstack: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  devops: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  mobile: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
  data_ml: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  system_design: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  security: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  dsa: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  other: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300',
};

export const TECH_STACK_SUGGESTIONS = {
  languages: [
    'javascript',
    'typescript',
    'python',
    'java',
    'go',
    'rust',
    'c++',
    'c#',
  ],
  frameworks: [
    'react',
    'nextjs',
    'nodejs',
    'express',
    'django',
    'fastapi',
    'spring boot',
    'flutter',
  ],
  tools: [
    'mongodb',
    'postgresql',
    'redis',
    'docker',
    'github actions',
    'vercel',
    'render',
    'stripe',
  ],
};

export const EXPERIENCE_LEVELS = [
  { value: 'student', label: 'Student' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
  { value: 'staff', label: 'Staff' },
  { value: 'principal', label: 'Principal' },
  { value: 'lead', label: 'Lead' },
];

export const SPECIALIZATIONS = CATEGORIES.filter((category) => category.value !== 'other').concat({
  value: 'other',
  label: 'Other',
  emoji: '💡',
  color: 'gray',
});

export const ROOM_SESSION_TYPES = [
  { value: 'pair_programming', label: 'Pair Programming', emoji: '👥' },
  { value: 'code_review', label: 'Code Review', emoji: '🔍' },
  { value: 'debugging', label: 'Debugging', emoji: '🐛' },
  { value: 'system_design', label: 'System Design', emoji: '🏗️' },
  { value: 'architecture_review', label: 'Architecture Review', emoji: '🏛️' },
  { value: 'mock_interview', label: 'Mock Interview', emoji: '🎯' },
  { value: 'deployment_help', label: 'Deployment Help', emoji: '🚀' },
  { value: 'workshop', label: 'Workshop', emoji: '🧪' },
  { value: 'mentoring', label: 'Mentoring', emoji: '⭐' },
  { value: 'open_discussion', label: 'Open Discussion', emoji: '💬' },
  { value: 'other', label: 'Other', emoji: '💡' },
];

export const HELP_SESSION_TYPES = ROOM_SESSION_TYPES.filter((type) => (
  !['system_design', 'workshop', 'open_discussion'].includes(type.value)
));

export const ROOM_DIFFICULTIES = [
  { value: 'any', label: 'Any level' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
