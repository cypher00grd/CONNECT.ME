import { useEffect, useState } from 'react';
import {
  Calendar,
  Edit2,
  Camera,
  Loader2,
  Megaphone,
  CalendarDays,
  Star,
  LifeBuoy,
  Github,
  ExternalLink,
  Briefcase,
  Code2,
  Search
} from 'lucide-react';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import FollowButton from './FollowButton';
import Modal from '../common/Modal';
import NotifyFollowersModal from './NotifyFollowersModal';
import ScheduleEventModal from './ScheduleEventModal';
import Input from '../common/Input';
import SkillTagInput from '../common/SkillTagInput';
import CreateTicketModal from '../Tickets/CreateTicketModal';
import { formatDate } from '../../utils/helpers';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { EXPERIENCE_LEVELS, SPECIALIZATIONS, TECH_STACK_SUGGESTIONS } from '../../utils/constants';

const getTechStack = (profileUser = {}) => ({
  languages: profileUser.techStack?.languages || [],
  frameworks: profileUser.techStack?.frameworks || [],
  tools: profileUser.techStack?.tools || [],
});

const getLabel = (items, value, fallback = 'Other') => (
  items.find((item) => item.value === value)?.label || fallback
);

const getProfileTags = (profileUser = {}) => {
  const stack = getTechStack(profileUser);
  return [...stack.languages, ...stack.frameworks, ...stack.tools].filter(Boolean);
};

const ProfileHeader = ({ user, isOwnProfile, onUpdateProfile }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDirectTicketModal, setShowDirectTicketModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    githubUsername: user?.githubUsername || '',
    githubUrl: user?.githubUrl || '',
    techStack: getTechStack(user),
    experienceLevel: user?.experienceLevel || 'mid',
    yearsOfExperience: user?.yearsOfExperience || 0,
    specialization: user?.specialization || 'other',
    openToMentor: !!(user?.openToMentor || user?.isInstructor),
    lookingForHelp: !!user?.lookingForHelp,
  });

  useEffect(() => {
    setEditForm({
      displayName: user?.displayName || '',
      bio: user?.bio || '',
      githubUsername: user?.githubUsername || '',
      githubUrl: user?.githubUrl || '',
      techStack: getTechStack(user),
      experienceLevel: user?.experienceLevel || 'mid',
      yearsOfExperience: user?.yearsOfExperience || 0,
      specialization: user?.specialization || 'other',
      openToMentor: !!(user?.openToMentor || user?.isInstructor),
      lookingForHelp: !!user?.lookingForHelp,
    });
  }, [user]);

  const handleSave = () => {
    onUpdateProfile({
      ...editForm,
      yearsOfExperience: Number(editForm.yearsOfExperience) || 0,
      isInstructor: !!editForm.openToMentor,
    });
    setShowEditModal(false);
  };

  const handleTechStackChange = (key, value) => {
    setEditForm((prev) => ({
      ...prev,
      techStack: {
        ...prev.techStack,
        [key]: value,
      },
    }));
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
      <div className="h-32 sm:h-48 bg-gray-100 dark:bg-dark-900 rounded-t-2xl relative overflow-hidden border-b border-gray-200/50 dark:border-dark-800/50">
        <div className="absolute top-0 left-1/4 w-full h-full bg-gradient-primary opacity-20 blur-[100px] pointer-events-none" />
      </div>

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
            <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white tracking-tight">
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
                variant="primary"
                leftIcon={<CalendarDays size={16} />}
                onClick={() => setShowScheduleModal(true)}
              >
                Schedule Live Event
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
            <div className="flex items-center gap-3">
              {user?.isInstructor && (
                <Button
                  variant="primary"
                  leftIcon={<LifeBuoy size={16} />}
                  onClick={() => setShowDirectTicketModal(true)}
                >
                  Raise Ticket
                </Button>
              )}
              <FollowButton
                userId={user?._id}
                isFollowing={user?.isFollowing}
              />
            </div>
          )}
        </div>

        {/* Bio */}
        {user?.bio && (
          <p className="mt-4 text-gray-700 dark:text-gray-300">
            {user.bio}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
            <Code2 size={14} />
            {getLabel(SPECIALIZATIONS, user?.specialization)}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-dark-800 text-gray-700 dark:text-gray-300 text-sm font-medium">
            <Briefcase size={14} />
            {getLabel(EXPERIENCE_LEVELS, user?.experienceLevel, 'Mid-level')}
            {Number(user?.yearsOfExperience) > 0 ? ` · ${user.yearsOfExperience} yrs` : ''}
          </span>
          {(user?.openToMentor || user?.isInstructor) && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium">
              <Star size={14} />
              Open to Mentor
            </span>
          )}
          {user?.lookingForHelp && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium">
              <Search size={14} />
              Looking for Help
            </span>
          )}
          {(user?.githubUrl || user?.githubUsername) && (
            <a
              href={user.githubUrl || `https://github.com/${user.githubUsername}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium hover:opacity-90"
            >
              <Github size={14} />
              GitHub
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        {getProfileTags(user).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {getProfileTags(user).slice(0, 12).map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-300 text-sm font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
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
          <div className="flex items-center gap-1">
            <span className="font-bold text-gray-900 dark:text-white">
              {(user?.rating ?? 5).toFixed(1)}
            </span>
            <span className="text-gray-500 dark:text-gray-400">Rating</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            ['Sessions', user?.sessionsCompleted || 0],
            ['Issues solved', user?.issuesResolved || 0],
            ['Code reviews', user?.codeReviewsGiven || 0],
            ['Hours helped', user?.hoursHelped || 0],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-gray-100 dark:border-dark-800 bg-gray-50 dark:bg-dark-900/50 px-3 py-2"
            >
              <p className="text-lg font-display font-bold text-gray-900 dark:text-white">
                {value}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Profile"
        size="lg"
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
              maxLength={500}
              placeholder="Describe your engineering background, current focus, or the kind of help you give."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="GitHub Username"
              value={editForm.githubUsername}
              onChange={(e) => setEditForm({ ...editForm, githubUsername: e.target.value })}
            />
            <Input
              label="GitHub Profile URL"
              value={editForm.githubUrl}
              onChange={(e) => setEditForm({ ...editForm, githubUrl: e.target.value })}
            />
          </div>
          <SkillTagInput
            label="Languages"
            value={editForm.techStack.languages}
            onChange={(languages) => handleTechStackChange('languages', languages)}
            placeholder="JavaScript, Python, Go..."
            max={8}
            suggestions={TECH_STACK_SUGGESTIONS.languages}
          />
          <SkillTagInput
            label="Frameworks"
            value={editForm.techStack.frameworks}
            onChange={(frameworks) => handleTechStackChange('frameworks', frameworks)}
            placeholder="React, Next.js, Express..."
            max={8}
            suggestions={TECH_STACK_SUGGESTIONS.frameworks}
          />
          <SkillTagInput
            label="Tools"
            value={editForm.techStack.tools}
            onChange={(tools) => handleTechStackChange('tools', tools)}
            placeholder="Docker, Redis, MongoDB..."
            max={8}
            suggestions={TECH_STACK_SUGGESTIONS.tools}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                Specialization
              </label>
              <select
                value={editForm.specialization}
                onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                className="input-field"
              >
                {SPECIALIZATIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                Experience
              </label>
              <select
                value={editForm.experienceLevel}
                onChange={(e) => setEditForm({ ...editForm, experienceLevel: e.target.value })}
                className="input-field"
              >
                {EXPERIENCE_LEVELS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Years"
              type="number"
              min="0"
              max="50"
              value={editForm.yearsOfExperience}
              onChange={(e) => setEditForm({ ...editForm, yearsOfExperience: e.target.value })}
            />
          </div>
          <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/40">
            <input
              type="checkbox"
              checked={editForm.openToMentor}
              onChange={(event) => setEditForm({ ...editForm, openToMentor: event.target.checked })}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
              Open to mentoring / helping others
            </span>
          </label>
          <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/40">
            <input
              type="checkbox"
              checked={editForm.lookingForHelp}
              onChange={(event) => setEditForm({ ...editForm, lookingForHelp: event.target.checked })}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
              Looking for engineering help
            </span>
          </label>
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

      {/* Schedule Live Event Modal */}
      <ScheduleEventModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
      />

      <CreateTicketModal
        isOpen={showDirectTicketModal}
        onClose={() => setShowDirectTicketModal(false)}
        targetHelper={user}
      />
    </>
  );
};

export default ProfileHeader;

// no imp made
