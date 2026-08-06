const Loader = ({ size = 'md', className = '', text = '' }) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`
          ${sizes[size]}
          border-primary-200 dark:border-dark-600
          border-t-primary-500
          rounded-full animate-spin
        `}
      />
      
      {text && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
      )}
    </div>
  );
};

// Full-page loader for route transitions
export const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-dark-950">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* Outer pulse ring */}
        <div className="w-16 h-16 border-4 border-primary-200 dark:border-dark-700 rounded-full animate-pulse" />

        {/* Inner spinning ring */}
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-primary-500 rounded-full animate-spin" />
      </div>

      <p className="text-lg font-semibold text-gradient">Connect.dev</p>
    </div>
  </div>
);

export default Loader;
