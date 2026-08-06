import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { initializeAuth } from './redux/Slices/authSlice';
import { setTheme } from './redux/Slices/themeSlice';

import ProtectedRoute from './components/Auth/ProtectedRoute';

const Layout = lazy(() => import('./components/Layout/Layout'));
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Profile = lazy(() => import('./pages/Profile'));
const Room = lazy(() => import('./pages/Room'));
const Explore = lazy(() => import('./pages/Explore'));
const Activity = lazy(() => import('./pages/Activity'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Components
import { PageLoader } from './components/common/Loader';
import { ToastContainer, useToast } from './components/common/Toast';
import { useSocket } from './hooks/useSocket';
import TicketNotificationCenter from './components/Tickets/TicketNotificationCenter';

function App() {
  const dispatch = useDispatch();
  const { user, initialized } = useSelector((state) => state.auth);
  const { mode } = useSelector((state) => state.theme);
  const toast = useToast();

  useSocket();

  //  Initialize auth on app load
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  // useEffect(() => {
  //   if (!localStorage.getItem("token")) return; // ⬅ prevent double initialization
  //   dispatch(initializeAuth());
  // }, []);

  // Apply theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      dispatch(setTheme(savedTheme));
    }

    // Apply dark class
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode, dispatch]);

  if (!initialized) {
    return <PageLoader />;
  }



  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/signup"
            element={user ? <Navigate to="/" replace /> : <Signup />}
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="explore" element={<Explore />} />
            <Route path="activity" element={<Activity />} />
            <Route path="my-rooms" element={<Navigate to="/activity" replace />} />
            <Route path="profile/:username" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Room Route (Full Screen) */}
          <Route
            path="/room/:roomId"
            element={
              <ProtectedRoute>
                <Room />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      <TicketNotificationCenter />

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
    </BrowserRouter>
  );
}

export default App;
