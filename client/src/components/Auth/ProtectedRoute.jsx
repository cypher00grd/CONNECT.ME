import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { PageLoader } from '../common/Loader';
import { useSelector } from "react-redux"

const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useSelector((state) => state.auth)
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }}
      replace />;
  }

  return children;
};

export default ProtectedRoute;