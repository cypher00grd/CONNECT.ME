import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import CreateRoomModal from '../Room/RoomModal';
import VideoCallNotification from '../VideoCall/VideoCallNotification';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
      {/* Navbar */}
      <Navbar
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        onCreateRoom={() => setCreateRoomOpen(true)}
      />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="pt-16 lg:pl-72 pb-20 lg:pb-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNav onCreateRoom={() => setCreateRoomOpen(true)} />

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={createRoomOpen}
        onClose={() => setCreateRoomOpen(false)}
      />

      {/* Video Call Notifications */}
      <VideoCallNotification />
    </div>
  );
};

export default Layout;