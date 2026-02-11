import { getInitials, getAvatarColor } from '../../utils/helpers';

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-xl',
  '3xl': 'w-24 h-24 text-2xl',
};

const Avatar = ({
  src,
  alt,
  name,
  size = 'md',
  showOnlineIndicator = false,
  isOnline = false,
  className = '',
}) => {
  const initials = getInitials(name || alt);
  const bgColor = getAvatarColor(name || alt);

  return (
    <div className={`relative inline-flex ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt || name}
          className={`
            ${sizes[size]}
            rounded-full object-cover
            ring-2 ring-white dark:ring-dark-800
          `}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      
      {/* Fallback with initials */}
      <div
        className={`
          ${sizes[size]}
          ${bgColor}
          ${src ? 'hidden' : 'flex'}
          items-center justify-center
          rounded-full
          font-semibold text-white
          ring-2 ring-white dark:ring-dark-800
        `}
      >
        {initials}
      </div>
      
      {/* Online indicator */}
      {showOnlineIndicator && (
        <span
          className={`
            absolute bottom-0 right-0
            w-3 h-3 rounded-full
            border-2 border-white dark:border-dark-800
            ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
          `}
        />
      )}
    </div>
  );
};

export default Avatar;