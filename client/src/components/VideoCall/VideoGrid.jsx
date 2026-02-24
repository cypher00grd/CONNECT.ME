import { useRef, useEffect } from 'react';
import { MicOff, VideoOff } from 'lucide-react';
import Avatar from '../common/Avatar';

const VideoTile = ({ stream, user, isLocal, styleClass, forceMuted = false, forceVideoOff = false }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // For remote streams, we shouldn't rely on a global 'isVideoOff' toggle.
  // Instead, just check if the stream itself has any active video tracks!
  const hasActiveVideo = stream && stream.getVideoTracks().some(track => track.enabled);

  return (
    <div className={`relative bg-dark-800 rounded-2xl overflow-hidden aspect-video shadow-lg ${styleClass} transition-all duration-300`}>
      {hasActiveVideo ? (
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
          <span className="text-white text-sm font-medium drop-shadow-md">
            {isLocal ? 'You' : user?.displayName}
          </span>
          <div className="flex items-center gap-2">
            {forceMuted && (
              <div className="p-1.5 bg-red-500 rounded-full shadow-sm">
                <MicOff size={14} className="text-white" />
              </div>
            )}
            {forceVideoOff && (
              <div className="p-1.5 bg-red-500 rounded-full shadow-sm">
                <VideoOff size={14} className="text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Local indicator */}
      {isLocal && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-primary-500 rounded-full text-white text-xs shadow-md">
          You
        </div>
      )}
    </div>
  );
};

const VideoGrid = ({ localStream, remoteStreams, localUser, participants, isAudioEnabled, isVideoEnabled, isSpectator = false, isLiveEvent = false }) => {
  // Broadcast Architecture Fix: Creators exclusively broadcast outwards. 
  // We explicitly strip any "blank" track reflections from their Viewer peer connections.
  const validRemoteStreams = (isLiveEvent && !isSpectator) ? {} : remoteStreams;

  const totalParticipants = Object.keys(validRemoteStreams).length + (isSpectator ? 0 : 1);

  // Calculate the ideal width for each tile to fill up the flex container based on participant count
  const getTileWidth = () => {
    if (totalParticipants === 1) return 'w-full max-w-5xl';
    // 2 people: Side by side (50% each minus flex gap)
    if (totalParticipants === 2) return 'w-[calc(50%-0.5rem)]';
    // 3 or 4 people: 2 columns (50% each minus flex gap)
    if (totalParticipants <= 4) return 'w-[calc(50%-0.5rem)]';
    // 5 or 6 people: 3 columns (33.33% each minus flex gap)
    if (totalParticipants <= 6) return 'w-[calc(33.333%-0.67rem)]';
    // 7 or more people: 4 columns or more...
    return 'w-[calc(25%-0.75rem)]';
  };

  const tileClass = getTileWidth();

  return (
    <div className="flex flex-wrap place-content-center items-center gap-2 p-2 h-full w-full max-h-screen overflow-hidden">
      {/* Local Video */}
      {!isSpectator && (
        <VideoTile
          stream={localStream}
          user={localUser}
          isLocal={true}
          forceMuted={!isAudioEnabled}
          forceVideoOff={!isVideoEnabled}
          styleClass={tileClass}
        />
      )}

      {/* Remote Videos */}
      {Object.entries(validRemoteStreams).map(([participantId, stream]) => {
        const participant = participants.find((p) => p._id === participantId);
        return (
          <VideoTile
            key={participantId}
            stream={stream}
            user={participant}
            isLocal={false}
            styleClass={tileClass}
          />
        );
      })}
    </div>
  );
};

export default VideoGrid;

//no changes