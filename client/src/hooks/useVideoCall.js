// import { useState, useRef, useCallback, useEffect } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import socketService from '../services/socket';

// import {
//   setVideoCallActive,
//   addVideoCallParticipant,
//   removeVideoCallParticipant,
//   clearVideoCall,
// } from '../redux/Slices/roomSlice';

// const ICE_SERVERS = {
//   iceServers: [
//     { urls: "stun:stun.l.google.com:19302" },
//     { urls: "stun:stun1.l.google.com:19302" },
//   ],
// };

// export const useVideoCall = (roomId) => {
//   const dispatch = useDispatch();
//   const { user } = useSelector((s) => s.auth);
//   const { videoCallParticipants } = useSelector((s) => s.rooms);

//   const [localStream, setLocalStream] = useState(null);
//   const [remoteStreams, setRemoteStreams] = useState({});
//   const [isAudioEnabled, setIsAudioEnabled] = useState(true);
//   const [isVideoEnabled, setIsVideoEnabled] = useState(true);
//   const [error, setError] = useState(null);

//   const peerConnections = useRef({});
//   const localVideoRef = useRef(null);

//   /* -----------------------------------------
//      GET LOCAL STREAM
//   ------------------------------------------*/
//   const getLocalStream = useCallback(async () => {
//     if (localStream) return localStream;

//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true,
//       });

//       setLocalStream(stream);

//       if (localVideoRef.current) {
//         localVideoRef.current.srcObject = stream;
//       }

//       return stream;
//     } catch (err) {
//       console.error("Media error:", err);
//       setError("Unable to access camera/microphone");
//       return null;
//     }
//   }, [localStream]);

//   /* -----------------------------------------
//      CREATE PEER CONNECTION
//   ------------------------------------------*/
//   const createPeerConnection = useCallback(
//     async (targetUserId) => {
//       const stream = await getLocalStream();
//       if (!stream) return null;

//       const pc = new RTCPeerConnection(ICE_SERVERS);

//       // add tracks
//       stream.getTracks().forEach((track) => {
//         pc.addTrack(track, stream);
//       });

//       // send ICE
//       pc.onicecandidate = (ev) => {
//         if (ev.candidate) {
//           socketService.sendIceCandidate(ev.candidate, targetUserId);
//         }
//       };

//       // receive stream
//       pc.ontrack = (ev) => {
//         setRemoteStreams((prev) => ({
//           ...prev,
//           [targetUserId]: ev.streams[0],
//         }));
//       };

//       // auto cleanup if failed
//       pc.onconnectionstatechange = () => {
//         if (["failed", "disconnected"].includes(pc.connectionState)) {
//           closePeerConnection(targetUserId);
//         }
//       };

//       peerConnections.current[targetUserId] = pc;
//       return pc;
//     },
//     [getLocalStream]
//   );

//   /* -----------------------------------------
//      CLOSE CONNECTION
//   ------------------------------------------*/
//   const closePeerConnection = useCallback((userId) => {
//     const pc = peerConnections.current[userId];
//     if (pc) {
//       pc.close();
//       delete peerConnections.current[userId];
//     }

//     setRemoteStreams((prev) => {
//       const next = { ...prev };
//       delete next[userId];
//       return next;
//     });
//   }, []);

//   /* -----------------------------------------
//      START CALL (CREATOR)
//   ------------------------------------------*/
//   const startCall = useCallback(async () => {
//     const stream = await getLocalStream();
//     if (!stream) return;

//     dispatch(setVideoCallActive(true));
//     dispatch(addVideoCallParticipant(user));

//     socketService.startVideoCall(roomId);
//   }, [getLocalStream, dispatch, user, roomId]);

//   /* -----------------------------------------
//      JOIN CALL (VIEWER)
//   ------------------------------------------*/
//   const joinCall = useCallback(async () => {
//     const stream = await getLocalStream();
//     if (!stream) return;

//     dispatch(addVideoCallParticipant(user));
//     socketService.joinVideoCall(roomId);

//     // create offers for others
//     for (const p of videoCallParticipants) {
//       if (p._id !== user._id) {
//         const pc = await createPeerConnection(p._id);
//         if (!pc) continue;

//         const offer = await pc.createOffer();
//         await pc.setLocalDescription(offer);

//         socketService.sendVideoOffer(roomId, offer, p._id);
//       }
//     }
//   }, [
//     getLocalStream,
//     dispatch,
//     user,
//     roomId,
//     videoCallParticipants,
//     createPeerConnection,
//   ]);

//   /* -----------------------------------------
//      LEAVE CALL
//   ------------------------------------------*/
//   const leaveCall = useCallback(() => {
//     if (localStream) {
//       localStream.getTracks().forEach((t) => t.stop());
//     }
//     setLocalStream(null);

//     // close all pcs
//     Object.keys(peerConnections.current).forEach(closePeerConnection);

//     dispatch(removeVideoCallParticipant(user._id));

//     // if no one left → reset
//     if (videoCallParticipants.length <= 1) {
//       dispatch(clearVideoCall());
//     }

//     socketService.leaveVideoCall(roomId);
//   }, [
//     localStream,
//     dispatch,
//     user,
//     roomId,
//     videoCallParticipants,
//     closePeerConnection,
//   ]);

//   /* -----------------------------------------
//      SIGNALING HANDLERS
//   ------------------------------------------*/
//   useEffect(() => {
//     if (!socketService.isConnected()) return;

//     // OFFER
//     const handleOffer = async ({ offer, fromUserId, fromUser }) => {
//       const pc = await createPeerConnection(fromUserId);
//       await pc.setRemoteDescription(new RTCSessionDescription(offer));

//       const answer = await pc.createAnswer();
//       await pc.setLocalDescription(answer);

//       socketService.sendVideoAnswer(answer, fromUserId);

//       if (fromUser) dispatch(addVideoCallParticipant(fromUser));
//     };

//     // ANSWER
//     const handleAnswer = async ({ answer, fromUserId }) => {
//       const pc = peerConnections.current[fromUserId];
//       if (pc) {
//         await pc.setRemoteDescription(new RTCSessionDescription(answer));
//       }
//     };

//     // ICE
//     const handleIce = async ({ candidate, fromUserId }) => {
//       const pc = peerConnections.current[fromUserId];
//       if (pc && candidate) {
//         await pc.addIceCandidate(new RTCIceCandidate(candidate));
//       }
//     };

//     socketService.on("video_offer", handleOffer);
//     socketService.on("video_answer", handleAnswer);
//     socketService.on("ice_candidate", handleIce);

//     return () => {
//       socketService.off("video_offer", handleOffer);
//       socketService.off("video_answer", handleAnswer);
//       socketService.off("ice_candidate", handleIce);
//     };
//   }, [createPeerConnection, dispatch]);

//   /* -----------------------------------------
//      CLEANUP ON UNMOUNT
//   ------------------------------------------*/
//   useEffect(() => {
//     return () => {
//       if (localStream) {
//         localStream.getTracks().forEach((t) => t.stop());
//       }
//       Object.keys(peerConnections.current).forEach(closePeerConnection);
//     };
//   }, []);

//   /* -----------------------------------------
//      TOGGLE AUDIO / VIDEO
//   ------------------------------------------*/
//   const toggleAudio = () => {
//     if (localStream) {
//       const track = localStream.getAudioTracks()[0];
//       if (track) {
//         track.enabled = !track.enabled;
//         setIsAudioEnabled(track.enabled);
//       }
//     }
//   };

//   const toggleVideo = () => {
//     if (localStream) {
//       const track = localStream.getVideoTracks()[0];
//       if (track) {
//         track.enabled = !track.enabled;
//         setIsVideoEnabled(track.enabled);
//       }
//     }
//   };

//   /* -----------------------------------------
//      RETURN
//   ------------------------------------------*/
//   return {
//     localVideoRef,
//     localStream,
//     remoteStreams,

//     startCall,
//     joinCall,
//     leaveCall,

//     toggleAudio,
//     toggleVideo,

//     isAudioEnabled,
//     isVideoEnabled,
//     videoCallParticipants,
//   };
// };

// export default useVideoCall;



import { useState, useRef, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import socketService from "../services/socket";
import {
  setVideoCallActive,
  addVideoCallParticipant,
  removeVideoCallParticipant,
  clearVideoCall,
} from "../redux/Slices/roomSlice";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export const useVideoCall = (roomId) => {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { videoCallParticipants } = useSelector((s) => s.rooms);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const peerConnections = useRef({});
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  /* ===========================
     GET LOCAL MEDIA
  ============================ */
  const getLocalStream = async () => {
    if (localStream) return localStream;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    setLocalStream(stream);
    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    return stream;
  };

  /* ===========================
     CREATE PEER
  ============================ */
  const createPeerConnection = async (targetUserId) => {
    console.log("Creating PC for:", targetUserId);

    const stream = await getLocalStream();
    const pc = new RTCPeerConnection(ICE_SERVERS);

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketService.sendIceCandidate(roomId, e.candidate, targetUserId);
      }
    };

    pc.ontrack = (e) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [targetUserId]: e.streams[0],
      }));
    };

    peerConnections.current[targetUserId] = pc;
    return pc;
  };

  /* ===========================
     START CALL (CREATOR)
  ============================ */
  const startCall = async () => {
    await getLocalStream();

    dispatch(setVideoCallActive(true));
    dispatch(addVideoCallParticipant(user));

    socketService.startVideoCall(roomId);
    socketService.joinVideoCall(roomId); // CRITICAL FIX
  };

  /* ===========================
     JOIN CALL
  ============================ */
  const joinCall = async () => {
    await getLocalStream();

    dispatch(addVideoCallParticipant(user));
    socketService.joinVideoCall(roomId);

    for (const p of videoCallParticipants) {
      if (p._id !== user._id) {
        const pc = await createPeerConnection(p._id);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socketService.sendVideoOffer(roomId, offer, p._id);
      }
    }
  };

  /* ===========================
     SIGNALING
  ============================ */
  useEffect(() => {
    const handleOffer = async ({ offer, from }) => {
      console.log('Received video offer from:', from);
      const pc = await createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketService.sendVideoAnswer(roomId, answer, from);
    };

    const handleAnswer = async ({ answer, from }) => {
      console.log('Received video answer from:', from);
      const pc = peerConnections.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleIce = async ({ candidate, from }) => {
      const pc = peerConnections.current[from];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const handleParticipantLeft = ({ userId }) => {
      console.log('Participant left video call:', userId);
      const pc = peerConnections.current[userId];
      if (pc) {
        pc.close();
        delete peerConnections.current[userId];
      }
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    socketService.on("video_offer", handleOffer);
    socketService.on("video_answer", handleAnswer);
    socketService.on("ice_candidate", handleIce);
    socketService.on("video_participant_left", handleParticipantLeft);

    return () => {
      socketService.off("video_offer", handleOffer);
      socketService.off("video_answer", handleAnswer);
      socketService.off("ice_candidate", handleIce);
      socketService.off("video_participant_left", handleParticipantLeft);
    };
  }, [roomId]);

  /* ===========================
     LEAVE CALL
  ============================ */
  const leaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }

    Object.values(peerConnections.current).forEach((pc) => pc.close());

    peerConnections.current = {};
    setRemoteStreams({});
    setLocalStream(null);
    localStreamRef.current = null;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    dispatch(clearVideoCall());
    socketService.leaveVideoCall(roomId);
  };

  /* ===========================
     CLEANUP ON UNMOUNT
  ============================ */
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      Object.values(peerConnections.current).forEach((pc) => pc.close());
    };
  }, []);

  /* ===========================
     TOGGLE AUDIO / VIDEO
  ============================ */
  const toggleAudio = () => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsAudioEnabled(track.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsVideoEnabled(track.enabled);
      }
    }
  };

  return {
    localVideoRef,
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    videoCallParticipants,
    toggleAudio,
    toggleVideo,
    startCall,
    joinCall,
    leaveCall,
  };
};

export default useVideoCall;