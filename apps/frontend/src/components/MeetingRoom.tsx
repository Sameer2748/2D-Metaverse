import React, { useRef, useState, useEffect } from "react";
import { Mic, MicOff, Video, VideoOff, Users } from "lucide-react";
import VideoGrid from "./VideoGrid";
import MeetingChat from "./MeetingChat";

// Update interfaces to match Space.tsx
interface User {
  id: string;
  name: string;
}

// Update to match UserPositionInfo in Space.tsx
interface MeetingRoomUser {
  userId?: string;
  name?: string;
  username?: string;
  x: number;
  y: number;
  direction: string;
  peerId?: string;
  Avatar?: string;
  inMeetingRoom?: boolean;
  stream?: MediaStream;
}

// Update to match ChatMessage in Space.tsx
interface ChatMessage {
  userId: string;
  message: string;
  timestamp?: number;
  sender?: string;
  isCurrentUser?: boolean;
  username?: string;
}

interface MeetingRoomProps {
  user: User;
  inMeetingRoom: boolean;
  meetingRoomUsers: Record<string, MeetingRoomUser>;
  meetingRoomChatMessages: ChatMessage[];
  meetingRoomChatInput: string;
  setMeetingRoomChatInput: (value: string) => void;
  handleMeetingRoomChatSubmit: (e: React.FormEvent) => void;
  sendMessage: (message: string) => void;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  hidemeetingroom: () => void;
  setShowMeetingRoom: () => void;
  spaceId: string;
}

const MeetingRoom: React.FC<MeetingRoomProps> = ({
  user,
  inMeetingRoom,
  meetingRoomUsers,
  meetingRoomChatMessages,
  meetingRoomChatInput,
  setMeetingRoomChatInput,
  handleMeetingRoomChatSubmit,
  sendMessage,
  localVideoRef,
  hidemeetingroom,
  setShowMeetingRoom,
  spaceId,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  console.log(meetingRoomUsers);
  // Initialize media stream when component mounts
  useEffect(() => {
    if (!inMeetingRoom) return;

    const initializeMediaStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // Save the stream reference
        setLocalStream(stream);

        // Connect the stream to the local video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        console.log("Media stream initialized successfully");
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    initializeMediaStream();

    // Cleanup function to stop all tracks when component unmounts
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, [inMeetingRoom]);

  // Monitor and log localVideoRef changes
  useEffect(() => {
    console.log("localVideoRef updated:", localVideoRef.current);
  }, [localVideoRef.current]);

  if (!inMeetingRoom) return null;

  // Prepare chat messages with isCurrentUser flag
  const formattedChatMessages = meetingRoomChatMessages.map((msg) => ({
    ...msg,
    isCurrentUser: msg.userId === user.id,
    sender: msg.username || "Unknown",
  }));

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted; // Toggle to opposite of current state
      });
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff; // Toggle to opposite of current state
      });
    }
    setIsVideoOff(!isVideoOff);
  };

  const leaveMeeting = () => {
    hidemeetingroom();
    sendMessage(
      JSON.stringify({
        type: "leave-meeting-room",
        payload: {
          userId: user.id,
          spaceId: spaceId,
        },
      })
    );
  };

  // Make sure we're passing proper user data to VideoGrid
  const formattedUsers: Record<string, any> = {};
  Object.entries(meetingRoomUsers).forEach(([id, userInfo]) => {
    formattedUsers[id] = {
      ...userInfo,
      userId: userInfo.userId || id,
      name:
        userInfo.name ||
        userInfo.username ||
        `User-${(userInfo.userId || id).substring(0, 5)}`,
    };
  });

  // Always include current user in users list when in the meeting room
  const usersWithCurrentUser = {
    ...formattedUsers,
    [user.id]: {
      userId: user.id,
      name: user.name || "You",
      stream: localStream,
      inMeetingRoom: true,
    },
  };

  return (
    <div className="meeting-container animate-fade-in z-50">
      <div className="meeting-header">
        <div className="flex items-center space-x-4">
          <button onClick={setShowMeetingRoom}>Hide MeetingRoom</button>
          <h2 className="text-lg font-medium flex items-center">
            <Users size={20} className="mr-2" />
            Meeting Room ({Object.keys(meetingRoomUsers).length} participants)
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={toggleMute}
            className="control-button"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            onClick={toggleVideo}
            className="control-button"
            aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}
          >
            {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
          </button>

          <button onClick={leaveMeeting} className="leave-button">
            Leave Meeting
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <VideoGrid
          localVideoRef={localVideoRef}
          users={usersWithCurrentUser}
          currentUserId={user.id}
        />

        <MeetingChat
          messages={formattedChatMessages}
          inputValue={meetingRoomChatInput}
          onInputChange={setMeetingRoomChatInput}
          onSubmit={handleMeetingRoomChatSubmit}
          currentUserId={user.id}
          spaceId={spaceId}
        />
      </div>
    </div>
  );
};

export default MeetingRoom;
