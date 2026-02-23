import { useState } from 'react';
import { Calendar, Link as LinkIcon, MapPin, Edit2, Camera, Loader2, Megaphone } from 'lucide-react';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import FollowButton from './FollowButton';
import Modal from '../common/Modal';
import NotifyFollowersModal from './NotifyFollowersModal';
import Input from '../common/Input';
import { formatDate } from '../../utils/helpers';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ProfileHeader = ({ user, isOwnProfile, onUpdateProfile }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
  });

  const handleSave = () => {
    onUpdateProfile(editForm);
    setShowEditModal(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      const res = await authAPI.uploadAvatar(formData);

      if (res.data?.success && res.data?.url) {
        // Send the Cloudinary URL cleanly to the MongoDB Profile Object
        onUpdateProfile({ avatar: res.data.url });
        toast.success('Profile picture updated!');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      {/* Cover Image */}
      <div className="h-32 sm:h-48 bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 rounded-t-2xl" />

      {/* Profile Info */}
      <div className="px-4 sm:px-6 pb-6">
        {/* Avatar Area */}
        <div className="relative -mt-16 sm:-mt-20 mb-4 inline-block">
          <div className="relative group">
            <Avatar
              src={user?.avatar}
              name={user?.displayName}
              size="3xl"
              className={`ring-4 ring-white dark:ring-dark-900 ${isOwnProfile && !isUploading ? 'group-hover:opacity-75 transition-opacity' : ''}`}
            />

            {isOwnProfile && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                {isUploading ? (
                  <Loader2 className="text-white animate-spin" size={28} />
                ) : (
                  <Camera className="text-white" size={28} />
                )}
              </label>
            )}
          </div>
        </div>

        {/* Name and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {user?.displayName}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              @{user?.username}
            </p>
          </div>

          {isOwnProfile ? (
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                leftIcon={<Megaphone size={16} />}
                onClick={() => setShowNotifyModal(true)}
              >
                Notify Followers
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Edit2 size={16} />}
                onClick={() => setShowEditModal(true)}
              >
                Edit Profile
              </Button>
            </div>
          ) : (
            <FollowButton
              userId={user?._id}
              isFollowing={user?.isFollowing}
            />
          )}
        </div>

        {/* Bio */}
        {user?.bio && (
          <p className="mt-4 text-gray-700 dark:text-gray-300">
            {user.bio}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar size={16} />
            Joined {formatDate(user?.createdAt)}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-1">
            <span className="font-bold text-gray-900 dark:text-white">
              {user?.following?.length || 0}
            </span>
            <span className="text-gray-500 dark:text-gray-400">Following</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-gray-900 dark:text-white">
              {user?.followers?.length || 0}
            </span>
            <span className="text-gray-500 dark:text-gray-400">Followers</span>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Profile"
      >
        <div className="p-6 space-y-4">
          <Input
            label="Display Name"
            value={editForm.displayName}
            onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              Bio
            </label>
            <textarea
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              rows={3}
              className="input-field resize-none"
              maxLength={150}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" fullWidth onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button fullWidth onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Notify Followers Modal */}
      <NotifyFollowersModal
        isOpen={showNotifyModal}
        onClose={() => setShowNotifyModal(false)}
        followersCount={user?.followers?.length || 0}
      />
    </>
  );
};

export default ProfileHeader;

// no imp made