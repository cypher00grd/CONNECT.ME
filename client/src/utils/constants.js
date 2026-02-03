export const CATEGORIES = [
  { value: 'singing', label: 'Singing', emoji: '🎤', color: 'pink' },
  { value: 'travel', label: 'Travel', emoji: '✈️', color: 'green' },
  { value: 'gaming', label: 'Gaming', emoji: '🎮', color: 'purple' },
  { value: 'study', label: 'Study', emoji: '📚', color: 'blue' },
  { value: 'coding', label: 'Coding', emoji: '💻', color: 'yellow' },
  { value: 'music', label: 'Music', emoji: '🎵', color: 'red' },
  { value: 'art', label: 'Art', emoji: '🎨', color: 'orange' },
  { value: 'fitness', label: 'Fitness', emoji: '💪', color: 'emerald' },
  { value: 'cooking', label: 'Cooking', emoji: '🍳', color: 'amber' },
  { value: 'other', label: 'Other', emoji: '✨', color: 'gray' },
];

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
  singing: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
  travel: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  gaming: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  study: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  coding: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  music: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  art: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  fitness: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  cooking: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  other: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300',
};

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';