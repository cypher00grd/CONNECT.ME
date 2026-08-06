import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Clock, Code2, GitBranch, ImagePlus, IndianRupee, Layers3, LifeBuoy, X } from 'lucide-react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import SkillTagInput from '../common/SkillTagInput';
import TechTagAutocomplete from '../common/TechTagAutocomplete';
import { authAPI } from '../../services/api';
import { createTicket } from '../../redux/Slices/ticketSlice';
import { HELP_SESSION_TYPES, ROOM_DIFFICULTIES } from '../../utils/constants';

const initialForm = {
  title: '',
  description: '',
  tags: [],
  sessionType: 'debugging',
  techStack: [],
  difficulty: 'intermediate',
  repoUrl: '',
  errorContext: '',
  bountyAmount: 0,
  estimatedMinutes: 30,
  screenshots: [],
};

const CreateTicketModal = ({ isOpen, onClose, targetHelper = null }) => {
  const dispatch = useDispatch();
  const { isCreating } = useSelector((state) => state.tickets);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  const resetAndClose = () => {
    setForm(initialForm);
    setErrors({});
    onClose();
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

  const validate = () => {
    const nextErrors = {};

    if (!form.title.trim()) nextErrors.title = 'Title is required';
    if (!form.description.trim()) nextErrors.description = 'Description is required';
    if (form.tags.length === 0) nextErrors.tags = 'Add at least one tag';
    if (Number(form.bountyAmount) < 0) nextErrors.bountyAmount = 'Bounty cannot be negative';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      const result = await dispatch(createTicket({
        ...form,
        bountyAmount: Number(form.bountyAmount || 0),
        estimatedMinutes: Number(form.estimatedMinutes),
        targetHelper: targetHelper?._id,
      })).unwrap();
      if (result.payment?.url) {
        toast.success('Redirecting to Stripe authorization');
        window.location.href = result.payment.url;
        return;
      }

      toast.success(targetHelper ? 'Direct ticket sent' : 'Ticket created');
      resetAndClose();
    } catch (error) {
      toast.error(error || 'Failed to create ticket');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title={targetHelper ? `Ticket for ${targetHelper.displayName}` : 'New Help Ticket'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Input
          label="Title"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          error={errors.title}
          placeholder="Production bug in checkout"
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
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            rows={5}
            className={`input-field resize-none ${errors.description ? '!border-red-500 !ring-red-500' : ''}`}
            placeholder="Share the error, context, and what you have already tried"
            maxLength={2000}
          />
          {errors.description && (
            <p className="mt-1.5 text-sm text-red-500">{errors.description}</p>
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
            placeholder="Paste the key error, failing command, stack trace, or reproduction notes"
            maxLength={3000}
          />
        </div>

        <Input
          label="Repository URL"
          value={form.repoUrl}
          onChange={(event) => setForm({ ...form, repoUrl: event.target.value })}
          leftIcon={<GitBranch size={18} />}
          placeholder="https://github.com/you/project"
          helperText="Optional, but helpful for code review or debugging"
        />

        <TechTagAutocomplete
          label="Tech stack"
          value={form.techStack}
          onChange={(techStack) => setForm({ ...form, techStack })}
          helperText="Technologies used in the failing area"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Bounty"
            type="number"
            min="0"
            step="1"
            value={form.bountyAmount}
            onChange={(event) => setForm({ ...form, bountyAmount: event.target.value })}
            error={errors.bountyAmount}
            leftIcon={<IndianRupee size={18} />}
            helperText="0 keeps this ticket free"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              Estimated time
            </label>
            <div className="relative">
              <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={form.estimatedMinutes}
                onChange={(event) => setForm({ ...form, estimatedMinutes: Number(event.target.value) })}
                className="input-field !pl-11"
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Screenshots
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {form.screenshots.length > 0
                  ? `${form.screenshots.length}/5 uploaded. Click a thumbnail to verify.`
                  : 'Attach error screens, logs, or UI states if useful.'}
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
                  <a href={screenshot.url} target="_blank" rel="noreferrer" className="block">
                    <img src={screenshot.url} alt={screenshot.name || 'Ticket screenshot'} className="h-28 w-full object-cover" />
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
          <Button type="submit" leftIcon={<LifeBuoy size={18} />} isLoading={isCreating || isUploading}>
            Find Help
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTicketModal;
