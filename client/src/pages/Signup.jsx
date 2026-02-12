import { Link } from 'react-router-dom';
import SignupForm from '../components/Auth/SignupForm';
import ThemeToggle from '../components/common/ThemeToggle';

const Signup = () => {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Illustration */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 items-center justify-center p-12">
        <div className="max-w-lg text-white text-center">
          <h2 className="text-4xl font-bold mb-6">
            Join the community
          </h2>
          <p className="text-lg opacity-90">
            Start creating rooms, following friends, and sharing your passions with the world.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-4 max-w-xs mx-auto">
            {['💻', '🎵', '🎨', '📚', '💪', '🍳'].map((emoji, i) => (
              <div
                key={i}
                className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-xl flex items-center justify-center text-2xl animate-float"
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
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">L</span>
            </div>
            <span className="text-2xl font-bold text-gradient">Linkly</span>
          </Link>

          <SignupForm />
        </div>
      </div>
    </div>
  );
};

export default Signup;