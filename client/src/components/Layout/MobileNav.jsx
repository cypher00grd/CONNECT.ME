import { NavLink } from 'react-router-dom';
import { Home, Compass, Plus, User, Bell } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import useAuth from '../../hooks/useAuth';

const MobileNav = ({ onCreateRoom }) => {
  const { username } = useAuth();
  const { unreadCount } = useSelector((state) => state.notifications);

  // Stable callback for action button
  const handleCreate = useCallback(() => {
    if (onCreateRoom) onCreateRoom();
  }, [onCreateRoom]);

  // Prepare nav items with memoization
  const navItems = useMemo(
    () => [
      { icon: Home, label: 'Home', path: '/' },
      { icon: Compass, label: 'Explore', path: '/explore' },
      { icon: Plus, label: 'Create', action: handleCreate, isAction: true },
      { icon: Bell, label: 'Alerts', path: '/notifications', badge: unreadCount },
      { icon: User, label: 'Profile', path: `/${username}` },
    ],
    [handleCreate, unreadCount, username]
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      <div className="glass border-t border-gray-200/50 dark:border-dark-700/50">
        <div className="flex items-center justify-around px-2 py-2">

          {navItems.map((item) =>
            item.isAction ? (
              <button
                key="create-room"
                onClick={item.action}
                className="flex flex-col items-center justify-center p-2 -mt-6"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-500 
                                rounded-full flex items-center justify-center 
                                shadow-lg shadow-primary-500/30">
                  <item.icon size={24} className="text-white" />
                </div>
              </button>
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex flex-col items-center justify-center p-2 min-w-[60px] relative
                  ${
                    isActive
                      ? 'text-primary-500'
                      : 'text-gray-500 dark:text-gray-400'
                  }
                `}
              >
                <item.icon size={22} />
                <span className="text-xs mt-1">{item.label}</span>

                {item.badge > 0 && (
                  <span className="
                    absolute top-1 right-2 w-5 h-5 bg-red-500 text-white text-xs 
                    rounded-full flex items-center justify-center
                  ">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </NavLink>
            )
          )}

        </div>
      </div>
    </nav>
  );
};

export default MobileNav;
