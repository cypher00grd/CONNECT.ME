import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  Video, 
  MoreVertical, 
  Share2, 
  LogOut,
  Trash2,
  Clock,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import ParticipantsList from './ParticipantsList';
import { getCategoryEmoji, getTimeRemaining, getRoomInviteLink, copyToClipboard } from '../../utils/helpers';
import { CATEGORY_COLORS } from '../../utils/constants';

const RoomHeader = ({ 
  room, 
  isCreator, 
  onLeave, 
  onEnd, 
  onStartVideoCall,
  videoCallActive,
  videoCallParticipants 
}) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const link = getRoomInviteLink(room._id);
    const success = await copyToClipboard(link);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setShowMenu(false);
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <>
      <header className="sticky top-0 z-30 glass border-b border-gray-200/50 dark:border-dark-700/50">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left Section */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </button>

            <div className="flex items-center gap-3">
              <Avatar
                src={room.creator?.avatar}
                name={room.creator?.displayName}
                size="md"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                    {room.title}
                  </h1>
                  {room.status === 'active' && (
                    <Badge variant="danger" dot>LIVE</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>@{room.creator?.username}</span>
                  <span>•</span>
                  <span className={`${CATEGORY_COLORS[room.category]?.split(' ')[0]} px-1.5 py-0.5 rounded text-xs`}>
                    {getCategoryEmoji(room.category)} {room.category}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Time Remaining */}
            {room.autoDeleteAt && (
              <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-sm">
                <Clock size={14} />
                {getTimeRemaining(room.autoDeleteAt)}
              </div>
            )}

            {/* Participants Button */}
            <button
              onClick={() => setShowParticipants(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-full transition-colors"
            >
              <Users size={16} className="text-gray-600 dark:text-gray-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {room.participants?.length || 0}
              </span>
            </button>

            {/* Video Call Button */}
            {room.isVideoEnabled && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onStartVideoCall}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors
                  ${videoCallActive
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-gray-200'
                  }
                `}
              >
                <Video size={16} />
                <span className="text-sm font-medium hidden sm:inline">
                  {videoCallActive ? `${videoCallParticipants.length} in call` : 'Video'}
                </span>
              </motion.button>
            )}

            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full transition-colors"
              >
                <MoreVertical size={20} className="text-gray-600 dark:text-gray-300" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-gray-100 dark:border-dark-700 py-1 z-20"
                    >
                      <button
                        onClick={handleShare}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                      >
                        {copied ? <Copy size={18} className="text-green-500" /> : <Share2 size={18} />}
                        {copied ? 'Copied!' : 'Share Room'}
                      </button>
                      
                      <hr className="my-1 border-gray-100 dark:border-dark-700" />
                      
                      {isCreator ? (
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            onEnd();
                          }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={18} />
                          End Room
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            onLeave();
                          }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <LogOut size={18} />
                          Leave Room
                        </button>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Participants Modal */}
      <Modal
        isOpen={showParticipants}
        onClose={() => setShowParticipants(false)}
        title="Participants"
        size="md"
      >
        <ParticipantsList
          participants={room.participants}
          creatorId={room.creator?._id}
          videoCallParticipants={videoCallParticipants}
        />
      </Modal>
    </>
  );
};

export default RoomHeader;