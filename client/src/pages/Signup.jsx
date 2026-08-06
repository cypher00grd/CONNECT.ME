import { Link } from 'react-router-dom';
import SignupForm from '../components/Auth/SignupForm';
import ThemeToggle from '../components/common/ThemeToggle';

const Signup = () => {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Illustration */}
      <div className="hidden lg:flex lg:flex-1 bg-gray-50 dark:bg-dark-900 border-r border-gray-200/50 dark:border-dark-800/50 items-center justify-center p-12 relative overflow-hidden">
        {/* Subtle Background Glows */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary-500/10 rounded-full blur-[100px]" />

        <div className="max-w-lg text-center relative z-10">
          <h2 className="text-4xl font-display font-bold mb-6 text-gray-900 dark:text-white leading-tight">
            Join the engineering community
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Start live coding sessions, get 1-on-1 help, and collaborate with developers worldwide.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6 max-w-xs mx-auto">
            {['🖥️', '⚙️', '📱', '🧠', '🚀', '🔒'].map((emoji, i) => (
              <div
                key={i}
                className="w-16 h-16 glass dark:glass-dark rounded-xl flex items-center justify-center text-2xl shadow-sm dark:shadow-glass animate-float hover:scale-110 transition-transform duration-300"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                {emoji}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="mx-auto w-full max-w-sm">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary shadow-sm dark:shadow-glow flex items-center justify-center">
              <span className="text-white font-display font-bold text-2xl">C</span>
            </div>
            <span className="text-2xl font-display font-bold tracking-tight text-gray-900 dark:text-white">
              Connect<span className="text-primary-500">.dev</span>
            </span>
          </Link>

          <SignupForm />
        </div>
      </div>
    </div>
  );
};

export default Signup;
