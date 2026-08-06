import { Link } from 'react-router-dom';
import LoginForm from '../components/Auth/LoginForm';
import ThemeToggle from '../components/common/ThemeToggle';

const Login = () => {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
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

          <LoginForm />
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex lg:flex-1 bg-gray-50 dark:bg-dark-900 border-l border-gray-200/50 dark:border-dark-800/50 items-center justify-center p-12 relative overflow-hidden">
        {/* Subtle Background Glows */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary-500/10 rounded-full blur-[100px]" />

        <div className="max-w-lg text-center relative z-10">
          <h2 className="text-4xl font-display font-bold mb-6 text-gray-900 dark:text-white leading-tight">
            Real-time collaboration for engineers
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Debug together, pair program, review code, and level up with live sessions.
          </p>

          <div className="mt-12 flex justify-center gap-6">
            <div className="w-20 h-20 glass dark:glass-dark rounded-2xl flex items-center justify-center text-4xl shadow-sm dark:shadow-glass hover:-translate-y-2 transition-transform duration-300">
              ⚙️
            </div>
            <div className="w-20 h-20 glass dark:glass-dark rounded-2xl flex items-center justify-center text-4xl shadow-sm dark:shadow-glass hover:-translate-y-2 transition-transform duration-300">
              🖥️
            </div>
            <div className="w-20 h-20 glass dark:glass-dark rounded-2xl flex items-center justify-center text-4xl shadow-sm dark:shadow-glass hover:-translate-y-2 transition-transform duration-300">
              🚀
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
