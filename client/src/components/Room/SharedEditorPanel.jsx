import { useEffect, useState } from 'react';
import { Code2, ExternalLink, Save } from 'lucide-react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import Button from '../common/Button';
import useSocket from '../../hooks/useSocket';

const LANGUAGE_OPTIONS = [
  'javascript',
  'typescript',
  'python',
  'java',
  'go',
  'rust',
  'cpp',
  'csharp',
  'html',
  'css',
  'sql',
  'text',
];

const SharedEditorPanel = ({ roomId, room }) => {
  const { updateRoomEditor } = useSocket(roomId, { listen: false });
  const currentEditor = useSelector((state) => state.rooms.currentRoom?.sharedEditor);
  const editor = currentEditor || room?.sharedEditor || {};

  const [title, setTitle] = useState(editor.title || 'Scratchpad');
  const [language, setLanguage] = useState(editor.language || 'javascript');
  const [code, setCode] = useState(editor.code || '');
  const [isSaving, setIsSaving] = useState(false);

  const updatedBy = editor.updatedBy?.displayName || editor.updatedBy?.username;
  const updatedAt = editor.updatedAt ? new Date(editor.updatedAt) : null;

  useEffect(() => {
    setTitle(editor.title || 'Scratchpad');
    setLanguage(editor.language || 'javascript');
    setCode(editor.code || '');
  }, [editor.title, editor.language, editor.code]);

  const dirty = (
    title !== (editor.title || 'Scratchpad') ||
    language !== (editor.language || 'javascript') ||
    code !== (editor.code || '')
  );

  const handleSave = () => {
    setIsSaving(true);
    updateRoomEditor({ title, language, code }, (response) => {
      setIsSaving(false);
      if (response?.success) {
        toast.success('Shared editor updated');
      } else {
        toast.error(response?.message || 'Failed to update shared editor');
      }
    });
  };

  return (
    <section className="flex h-full min-h-0 flex-col border-r border-dark-800/50 bg-gray-950/80">
      <div className="border-b border-dark-800/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <Code2 size={18} className="text-primary-400" />
              Shared Editor
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Last-write-wins scratchpad for this session.
            </p>
          </div>
          {room?.repositoryUrl && (
            <a
              href={room.repositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-dark-700 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-dark-800"
            >
              Repo
              <ExternalLink size={12} />
            </a>
          )}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px]">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={80}
            className="input-field"
            placeholder="Snippet title"
          />
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="input-field"
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <textarea
        value={code}
        onChange={(event) => setCode(event.target.value)}
        spellCheck={false}
        className="min-h-0 flex-1 resize-none border-0 bg-gray-950 p-4 font-mono text-sm leading-relaxed text-gray-100 outline-none placeholder:text-gray-600"
        placeholder="// Share code, logs, stack traces, or notes here..."
      />

      <div className="flex items-center justify-between gap-3 border-t border-dark-800/50 p-4">
        <p className="min-w-0 truncate text-xs text-gray-500">
          {updatedBy && updatedAt
            ? `Updated by ${updatedBy} at ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'No shared edits yet'}
        </p>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!dirty || isSaving}
          isLoading={isSaving}
          leftIcon={<Save size={15} />}
        >
          Save
        </Button>
      </div>
    </section>
  );
};

export default SharedEditorPanel;
