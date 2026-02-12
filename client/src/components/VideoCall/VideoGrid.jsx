import { useRef, useEffect } from 'react';
import { MicOff, VideoOff } from 'lucide-react';
import Avatar from '../common/Avatar';

const VideoTile = ({ stream, user, isLocal, isMuted, isVideoOff }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-dark-800 rounded-2xl overflow-hidden aspect-video">
      {stream && !isVideoOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Avatar
            src={user?.avatar}
            name={user?.displayName}
            size="2xl"
          />
        </div>
      )}

      {/* User Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-medium">
            {isLocal ? 'You' : user?.displayName}
          </span>
          <div className="flex items-center gap-2">
            {isMuted && (
              <div className="p-1 bg-red-500 rounded-full">
                <MicOff size={12} className="text-white" />
              </div>
            )}
            {isVideoOff && (
              <div className="p-1 bg-red-500 rounded-full">
                <VideoOff size={12} className="text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Local indicator */}
      {isLocal && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-primary-500 rounded-full text-white text-xs">
          You
        </div>
      )}
    </div>
  );
};

const VideoGrid = ({ localStream, remoteStreams, localUser, participants, isAudioEnabled, isVideoEnabled }) => {
  const totalParticipants = Object.keys(remoteStreams).length + 1;

  // Calculate grid columns based on participant count
  const getGridCols = () => {
    if (totalParticipants === 1) return 'grid-cols-1';
    if (totalParticipants === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2';
    if (totalParticipants <= 6) return 'grid-cols-2 sm:grid-cols-3';
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  };

  return (
    <div className={`grid ${getGridCols()} gap-4 p-4 h-full`}>
      {/* Local Video */}
      <VideoTile
        stream={localStream}
        user={localUser}
        isLocal={true}
        isMuted={!isAudioEnabled}
        isVideoOff={!isVideoEnabled}
      />

      {/* Remote Videos */}
      {Object.entries(remoteStreams).map(([oderId, stream]) => {
        const participant = participants.find((p) => p._id === oderId);
        return (
          <VideoTile
            key={userId}
            stream={stream}
            user={participant}
            isLocal={false}
          />
        );
      })}
    </div>
  );
};

export default VideoGrid;

//no changes