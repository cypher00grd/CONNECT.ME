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
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">L</span>
            </div>
            <span className="text-2xl font-bold text-gradient">Linkly</span>
          </Link>

          <LoginForm />
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary-500 via-purple-500 to-pink-500 items-center justify-center p-12">
        <div className="max-w-lg text-white text-center">
          <h2 className="text-4xl font-bold mb-6">
            Connect with people in real-time
          </h2>
          <p className="text-lg opacity-90">
            Create rooms, share moments, and build meaningful connections with your community.
          </p>

          <div className="mt-12 flex justify-center gap-4">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center text-4xl">
              🎤
            </div>
            <div className="w-20 h-20 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center text-4xl">
              ✈️
            </div>
            <div className="w-20 h-20 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center text-4xl">
              🎮
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;