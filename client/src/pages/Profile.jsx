import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Radio, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { getUserProfile, clearViewedProfile } from '../redux/Slices/userSlice';
import { updateProfile } from '../redux/Slices/authSlice';
import ProfileHeader from '../components/User/ProfileHeader';
import FollowersList from '../components/User/FollowersList';
import RoomCard from '../components/Room/RoomCard';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import useAuth from '../hooks/useAuth';

const Profile = () => {
  const { username } = useParams();
  const dispatch = useDispatch();
  const { userId } = useAuth();
  const { viewedProfile, isLoading } = useSelector((state) => state.users);
  const [activeTab, setActiveTab] = useState('rooms');

  useEffect(() => {
    if (username) {
      dispatch(getUserProfile(username));
    }

    return () => {
      dispatch(clearViewedProfile());
    };
  }, [username, dispatch]);

  const handleUpdateProfile = async (data) => {
    await dispatch(updateProfile(data));
    dispatch(getUserProfile(username));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader size="lg" />
      </div>
    );
  }

  if (!viewedProfile) {
    return (
      <EmptyState
        icon={<Users size={32} />}
        title="User not found"
        description="The user you're looking for doesn't exist."
      />
    );
  }

  const isOwnProfile = viewedProfile._id === userId;

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        <ProfileHeader
          user={viewedProfile}
          isOwnProfile={isOwnProfile}
          onUpdateProfile={handleUpdateProfile}
        />
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-dark-700">
        {['rooms', 'followers', 'following'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-3 font-medium capitalize transition-colors relative
              ${activeTab === tab
                ? 'text-primary-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }
            `}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'rooms' && (
          <div className="space-y-4">
            {/* TODO: Fetch user's rooms */}
            <EmptyState
              icon={<Radio size={32} />}
              title="No rooms yet"
              description={isOwnProfile ? "You haven't created any rooms yet." : "This user hasn't created any rooms yet."}
            />
          </div>
        )}

        {activeTab === 'followers' && (
          <div className="card p-4">
            <FollowersList
              users={viewedProfile.followers}
              type="followers"
              emptyMessage="No followers yet"
            />
          </div>
        )}

        {activeTab === 'following' && (
          <div className="card p-4">
            <FollowersList
              users={viewedProfile.following}
              type="following"
              emptyMessage="Not following anyone yet"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;