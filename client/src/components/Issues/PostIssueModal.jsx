import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Bug, Code2, GitBranch, ImagePlus, IndianRupee, Layers3, X } from 'lucide-react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import SkillTagInput from '../common/SkillTagInput';
import TechTagAutocomplete from '../common/TechTagAutocomplete';
import { authAPI } from '../../services/api';
import { createIssue, getIssueFeed, getMyIssues } from '../../redux/Slices/issueSlice';
import { HELP_SESSION_TYPES, ROOM_DIFFICULTIES } from '../../utils/constants';

const initialForm = {
  title: '',
  details: '',
  tags: [],
  sessionType: 'debugging',
  techStack: [],
  difficulty: 'intermediate',
  repoUrl: '',
  errorContext: '',
  bountyAmount: 0,
  screenshots: [],
};

const PostIssueModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { isCreating } = useSelector((state) => state.issues);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  const resetAndClose = () => {
    setForm(initialForm);
    setErrors({});
    onClose();
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'Title is required';
    if (!form.details.trim()) nextErrors.details = 'Details are required';
    if (form.tags.length === 0) nextErrors.tags = 'Add at least one tag';
    if (Number(form.bountyAmount) < 0) nextErrors.bountyAmount = 'Bounty cannot be negative';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleScreenshots = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, 5 - form.screenshots.length);
    if (files.length === 0) return;

    try {
      setIsUploading(true);
      const uploaded = [];

      for (const file of files) {
        const data = new FormData();
        data.append('image', file);
        const response = await authAPI.uploadImage(data);
        if (response.data?.url) {
          uploaded.push({
            url: response.data.url,
            name: file.name,
            size: file.size,
          });
        }
      }

      setForm((current) => ({
        ...current,
        screenshots: [...current.screenshots, ...uploaded].slice(0, 5),
      }));
      if (uploaded.length > 0) {
        toast.success(`${uploaded.length} screenshot${uploaded.length > 1 ? 's' : ''} uploaded`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload screenshot');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const removeScreenshot = (url) => {
    setForm((current) => ({
      ...current,
      screenshots: current.screenshots.filter((screenshot) => screenshot.url !== url),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      await dispatch(createIssue({
        ...form,
        bountyAmount: Number(form.bountyAmount || 0),
      })).unwrap();
      dispatch(getIssueFeed());
      dispatch(getMyIssues());
      toast.success('Issue posted');
      resetAndClose();
    } catch (error) {
      toast.error(error || 'Failed to post issue');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Post Issue" size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Input
          label="Title"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          error={errors.title}
          placeholder="Need help debugging auth redirects"
          maxLength={120}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              Help type
            </label>
            <div className="relative">
              <Code2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={form.sessionType}
                onChange={(event) => setForm({ ...form, sessionType: event.target.value })}
                className="input-field !pl-11"
              >
                {HELP_SESSION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              Difficulty
            </label>
            <div className="relative">
              <Layers3 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={form.difficulty}
                onChange={(event) => setForm({ ...form, difficulty: event.target.value })}
                className="input-field !pl-11"
              >
                {ROOM_DIFFICULTIES.filter((difficulty) => difficulty.value !== 'any').map((difficulty) => (
                  <option key={difficulty.value} value={difficulty.value}>
                    {difficulty.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
            Detailed issue
          </label>
          <textarea
            value={form.details}
            onChange={(event) => setForm({ ...form, details: event.target.value })}
            rows={7}
            className={`input-field resize-none ${errors.details ? '!border-red-500 !ring-red-500' : ''}`}
            placeholder="Describe what is broken, what you expected, what you tried, and any relevant logs."
            maxLength={5000}
          />
          {errors.details && (
            <p className="mt-1.5 text-sm text-red-500">{errors.details}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
            Error context
          </label>
          <textarea
            value={form.errorContext}
            onChange={(event) => setForm({ ...form, errorContext: event.target.value })}
            rows={3}
            className="input-field resize-none"
            placeholder="Paste the failing command, stack trace, relevant logs, or reproduction notes"
            maxLength={3000}
          />
        </div>

        <Input
          label="Repository URL"
          value={form.repoUrl}
          onChange={(event) => setForm({ ...form, repoUrl: event.target.value })}
          leftIcon={<GitBranch size={18} />}
          placeholder="https://github.com/you/project"
          helperText="Optional, if the resolver needs code context"
        />

        <TechTagAutocomplete
          label="Tech stack"
          value={form.techStack}
          onChange={(techStack) => setForm({ ...form, techStack })}
          helperText="Technologies involved in this issue"
          max={8}
        />

        <div>
          <SkillTagInput
            label="Tags"
            value={form.tags}
            onChange={(tags) => setForm({ ...form, tags })}
            placeholder="React, Stripe, MongoDB..."
          />
          {errors.tags && (
            <p className="mt-1.5 text-sm text-red-500">{errors.tags}</p>
          )}
        </div>

        <Input
          label="Bounty if fixed"
          type="number"
          min="0"
          step="1"
          value={form.bountyAmount}
          onChange={(event) => setForm({ ...form, bountyAmount: event.target.value })}
          error={errors.bountyAmount}
          leftIcon={<IndianRupee size={18} />}
          helperText="You pay only after approving the fix"
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Screenshots
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {form.screenshots.length > 0
                  ? `${form.screenshots.length}/5 uploaded. Click a thumbnail to preview.`
                  : 'Attach relevant images if they help explain the issue.'}
              </p>
            </div>
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-dark-800 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-200 dark:hover:bg-dark-700 transition-colors">
              <ImagePlus size={16} />
              {isUploading ? 'Uploading...' : 'Add'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleScreenshots}
                disabled={isUploading || form.screenshots.length >= 5}
              />
            </label>
          </div>

          {form.screenshots.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {form.screenshots.map((screenshot) => (
                <div key={screenshot.url} className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900">
                  <a href={screenshot.url} target="_blank" rel="noreferrer" className="block group">
                    <img src={screenshot.url} alt={screenshot.name || 'Issue screenshot'} className="h-28 w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 bg-black/65 text-white text-xs">
                      <span className="block truncate">
                        {screenshot.name || 'Preview image'}
                      </span>
                      <span className="text-white/75">Click to verify</span>
                    </div>
                  </a>
                  <button
                    type="button"
                    onClick={() => removeScreenshot(screenshot.url)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white"
                    aria-label="Remove screenshot"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button type="submit" leftIcon={<Bug size={18} />} isLoading={isCreating || isUploading}>
            Post Issue
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PostIssueModal;
