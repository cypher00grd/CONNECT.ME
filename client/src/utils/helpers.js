import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date) => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

// Format message time
export const formatMessageTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  
  if (isToday(d)) {
    return format(d, 'h:mm a');
  } else if (isYesterday(d)) {
    return `Yesterday ${format(d, 'h:mm a')}`;
  }
  return format(d, 'MMM d, h:mm a');
};

// Format date for display
export const formatDate = (date) => {
  if (!date) return '';
  return format(new Date(date), 'MMM d, yyyy');
};

// Truncate text
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Get initials from name
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Generate random color for avatar
export const getAvatarColor = (name) => {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];
  
  if (!name) return colors[0];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

// Validate email
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Validate username
export const isValidUsername = (username) => {
  const regex = /^[a-zA-Z0-9_]{3,20}$/;
  return regex.test(username);
};

// Get category emoji
export const getCategoryEmoji = (category) => {
  const emojis = {
    singing: '🎤',
    travel: '✈️',
    gaming: '🎮',
    study: '📚',
    coding: '💻',
    music: '🎵',
    art: '🎨',
    fitness: '💪',
    cooking: '🍳',
    other: '✨',
  };
  return emojis[category] || '✨';
};

// Calculate time remaining for auto-delete
export const getTimeRemaining = (autoDeleteAt) => {
  if (!autoDeleteAt) return null;
  
  const now = new Date();
  const deleteTime = new Date(autoDeleteAt);
  const diff = deleteTime - now;
  
  if (diff <= 0) return 'Ending soon';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

// Generate room invite link
export const getRoomInviteLink = (roomId) => {
  return `${window.location.origin}/room/${roomId}`;
};

// Check if user is room creator
export const isRoomCreator = (room, userId) => {
  if (!room || !userId) return false;
  const creatorId = room.creator?._id || room.creator;
  return creatorId === userId || creatorId?.toString() === userId?.toString();
};

// Check if user is participant
export const isParticipant = (room, userId) => {
  if (!room || !userId) return false;
  return room.participants?.some((p) => {
    const participantId = p.user?._id || p.user;
    return participantId === userId || participantId?.toString() === userId?.toString();
  });
};

// Format participant count
export const formatParticipantCount = (count) => {
  if (count === 1) return '1 participant';
  return `${count} participants`;
};

// Generate gradient based on string
export const getGradient = (str) => {
  const gradients = [
    'from-pink-500 to-rose-500',
    'from-purple-500 to-indigo-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-emerald-500',
    'from-yellow-500 to-orange-500',
    'from-red-500 to-pink-500',
    'from-indigo-500 to-purple-500',
    'from-cyan-500 to-blue-500',
  ];
  
  if (!str) return gradients[0];
  const index = str.charCodeAt(0) % gradients.length;
  return gradients[index];
};