import { useSelector } from 'react-redux';

export const useAuth = () => {
  const { user, token, isLoading } = useSelector((state) => state.auth);

  return {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    userId: user?._id,
    username: user?.username,
  };
};

export default useAuth;