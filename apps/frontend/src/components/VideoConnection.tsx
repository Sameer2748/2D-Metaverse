import { useState, useRef, useEffect } from 'react';

interface WebRTCConnection {
  peerId: string;
  peerConnection?: RTCPeerConnection;
  stream?: MediaStream;
  isInitiator: boolean;
}

interface VideoConnectionProps {
  ws: WebSocket | null;
  userId: string;
}

const useVideoConnection = ({ ws, userId }: VideoConnectionProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [connections, setConnections] = useState<{[key: string]: WebRTCConnection}>({});
  const [pendingConnections, setPendingConnections] = useState<{[key: string]: boolean}>({});
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<{[key: string]: HTMLVideoElement}>({});

  // STUN servers for NAT traversal
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Initialize local media stream
  useEffect(() => {
    const initializeLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    initializeLocalStream();
  }, []);

  // WebSocket message handler for WebRTC signaling
  useEffect(() => {
    if (!ws) return;

    const handleWebSocketMessage = async (event: MessageEvent) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'webrtc-offer':
          await handleOffer(message);
          break;
        case 'webrtc-answer':
          await handleAnswer(message);
          break;
        case 'webrtc-ice-candidate':
          await handleIceCandidate(message);
          break;
        case 'video-connection-request':
          handleVideoConnectionRequest(message);
          break;
        case 'video-connection-response':
          handleVideoConnectionResponse(message);
          break;
      }
    };

    ws.addEventListener('message', handleWebSocketMessage);
    return () => {
      ws.removeEventListener('message', handleWebSocketMessage);
    };
  }, [ws, localStream]);

  // Initiate video connection
  const initiateVideoConnection = async (targetUserId: string) => {
    if (!localStream || !ws) return;

    try {
      // Create peer connection
      const peerConnection = new RTCPeerConnection(configuration);
      
      // Add local stream tracks
      localStream.getTracks().forEach(track => 
        peerConnection.addTrack(track, localStream)
      );

      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        setConnections(prev => ({
          ...prev,
          [targetUserId]: {
            ...prev[targetUserId],
            stream: event.streams[0]
          }
        }));

        // Set remote video stream
        if (remoteVideoRefs.current[targetUserId]) {
          remoteVideoRefs.current[targetUserId].srcObject = event.streams[0];
        }
      };

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      ws.send(JSON.stringify({
        type: 'video-connection-request',
        payload: {
          targetUserId,
          offer: offer.sdp
        }
      }));

      // Update connections state
      setConnections(prev => ({
        ...prev,
        [targetUserId]: {
          peerId: targetUserId,
          peerConnection,
          isInitiator: true
        }
      }));

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          ws.send(JSON.stringify({
            type: 'webrtc-ice-candidate',
            payload: {
              targetUserId,
              candidate: event.candidate
            }
          }));
        }
      };

    } catch (error) {
      console.error('Error initiating video connection:', error);
    }
  };

  // Handle incoming video connection request
  const handleVideoConnectionRequest = async (message: any) => {
    const { targetUserId, offer } = message.payload;

    // Prompt user for video connection
    const confirmed = window.confirm(`${targetUserId} wants to start a video call. Accept?`);
    
    if (confirmed) {
      try {
        const peerConnection = new RTCPeerConnection(configuration);
        
        // Add local stream tracks
        if (localStream) {
          localStream.getTracks().forEach(track => 
            peerConnection.addTrack(track, localStream)
          );
        }

        // Handle incoming tracks
        peerConnection.ontrack = (event) => {
          setConnections(prev => ({
            ...prev,
            [targetUserId]: {
              ...prev[targetUserId],
              stream: event.streams[0]
            }
          }));

          // Set remote video stream
          if (remoteVideoRefs.current[targetUserId]) {
            remoteVideoRefs.current[targetUserId].srcObject = event.streams[0];
          }
        };

        // Set remote description
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription({ type: 'offer', sdp: offer })
        );

        // Create answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Send answer back
        ws.send(JSON.stringify({
          type: 'video-connection-response',
          payload: {
            targetUserId,
            answer: answer.sdp
          }
        }));

        // Update connections state
        setConnections(prev => ({
          ...prev,
          [targetUserId]: {
            peerId: targetUserId,
            peerConnection,
            isInitiator: false
          }
        }));

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            ws.send(JSON.stringify({
              type: 'webrtc-ice-candidate',
              payload: {
                targetUserId,
                candidate: event.candidate
              }
            }));
          }
        };

      } catch (error) {
        console.error('Error handling video connection request:', error);
      }
    } else {
      // Reject video connection
      ws.send(JSON.stringify({
        type: 'video-connection-response',
        payload: {
          targetUserId,
          answer: null
        }
      }));
    }
  };

  // Handle video connection response
  const handleVideoConnectionResponse = async (message: any) => {
    const { targetUserId, answer } = message.payload;
    const connection = connections[targetUserId];

    if (connection && connection.peerConnection && answer) {
      try {
        await connection.peerConnection.setRemoteDescription(
          new RTCSessionDescription({ type: 'answer', sdp: answer })
        );
      } catch (error) {
        console.error('Error setting remote description:', error);
      }
    }
  };

  // Handle incoming offer
  const handleOffer = async (message: any) => {
    // Similar to handleVideoConnectionRequest logic
  };

  // Handle incoming answer
  const handleAnswer = async (message: any) => {
    // Similar to handleVideoConnectionResponse logic
  };

  // Handle ICE candidates
  const handleIceCandidate = async (message: any) => {
    const { targetUserId, candidate } = message.payload;
    const connection = connections[targetUserId];

    if (connection && connection.peerConnection) {
      try {
        await connection.peerConnection.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  };

  // Close video connection
  const closeVideoConnection = (targetUserId: string) => {
    const connection = connections[targetUserId];
    if (connection && connection.peerConnection) {
      connection.peerConnection.close();
      
      // Remove connection and stop tracks
      setConnections(prev => {
        const newConnections = { ...prev };
        delete newConnections[targetUserId];
        return newConnections;
      });

      // Clear remote video
      if (remoteVideoRefs.current[targetUserId]) {
        remoteVideoRefs.current[targetUserId].srcObject = null;
      }
    }
  };

  return {
    localStream,
    localVideoRef,
    remoteVideoRefs,
    connections,
    initiateVideoConnection,
    closeVideoConnection
  };
};

export default useVideoConnection;