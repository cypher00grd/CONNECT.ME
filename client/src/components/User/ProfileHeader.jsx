import { useState } from 'react';
import { Calendar, Link as LinkIcon, MapPin, Edit2 } from 'lucide-react';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import FollowButton from './FollowButton';
import Modal from '../common/Modal';
import Input from '../common/Input';
import { formatDate } from '../../utils/helpers';

const ProfileHeader = ({ user, isOwnProfile, onUpdateProfile }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
  });

  const handleSave = () => {
    onUpdateProfile(editForm);
    setShowEditModal(false);
  };

  return (
    <>
      {/* Cover Image */}
      <div className="h-32 sm:h-48 bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 rounded-t-2xl" />

      {/* Profile Info */}
      <div className="px-4 sm:px-6 pb-6">
        {/* Avatar */}
        <div className="relative -mt-16 sm:-mt-20 mb-4">
          <Avatar
            src={user?.avatar}
            name={user?.displayName}
            size="3xl"
            className="ring-4 ring-white dark:ring-dark-900"
          />
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
            <Button
              variant="secondary"
              leftIcon={<Edit2 size={16} />}
              onClick={() => setShowEditModal(true)}
            >
              Edit Profile
            </Button>
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
    </>
  );
};

export default ProfileHeader;


// no imp made