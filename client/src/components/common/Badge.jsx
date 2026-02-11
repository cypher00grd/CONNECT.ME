const variants = {
  primary: 'badge-primary',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  gray: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
};

const dotColors = {
  primary: 'bg-primary-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
  gray: 'bg-gray-400 dark:bg-gray-500',
};

const Badge = ({ children, variant = 'primary', className = '', dot = false }) => {
  return (
    <span className={`badge ${variants[variant]} ${className}`}>
      {dot && (
        <span
          className={`
            w-1.5 h-1.5 rounded-full mr-1.5
            ${dotColors[variant]}
          `}
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
