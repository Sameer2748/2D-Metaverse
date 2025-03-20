import React, { useRef, useState, useEffect } from "react";
import { Mic, MicOff, Video, VideoOff, Users } from "lucide-react";
import VideoGrid from "./VideoGrid";
import { GiFastBackwardButton } from "react-icons/gi";

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
  senderId: string;
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
  setInMeetingRoom: (value: boolean) => void;
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
  setInMeetingRoom,
  spaceId,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [meetingRoomChatMessages]);

  // If not in meeting room area, this component shouldn't render
  if (!inMeetingRoom) return null;

  // Prepare chat messages with isCurrentUser flag
  const formattedChatMessages = meetingRoomChatMessages.map((msg) => ({
    ...msg,
    isCurrentUser: msg.senderId === user.id,
    sender: msg.sender || msg.username || "Unknown",
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

  // This only hides the UI but doesn't disconnect from the meeting
  const hideMeetingRoom = () => {
    setShowMeetingRoom();
  };

  // This physically leaves the meeting and disconnects
  const leaveMeeting = () => {
    hidemeetingroom(); // Hide the UI

    // Send message that user is leaving the meeting
    sendMessage(
      JSON.stringify({
        type: "leave-meeting-room",
        payload: {
          userId: user.id,
          spaceId: spaceId,
        },
      })
    );

    // Update the inMeetingRoom state to trigger cleanup
    setInMeetingRoom(false);
  };

  // Make sure we're passing proper user data to VideoGrid

  const formattedUsers: Record<string, MeetingRoomUser> = {};
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
    <div className="fixed inset-0 flex flex-col bg-gray-900 text-white z-50 animate-fade-in">
      <div className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={hideMeetingRoom}
            className="hover:bg-gray-700 p-2 rounded-full transition-colors"
          >
            <GiFastBackwardButton color="white" size={25} />
          </button>
          <h2 className="text-lg font-medium flex items-center">
            <Users size={20} className="mr-2" />
            Meeting Room ({Object.keys(meetingRoomUsers).length + 1}{" "}
            participants)
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={toggleMute}
            className={`p-2 rounded-full transition-colors ${isMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"}`}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-2 rounded-full transition-colors ${isVideoOff ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"}`}
            aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}
          >
            {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
          </button>

          <button
            onClick={leaveMeeting}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md transition-colors"
          >
            Leave Meeting
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Video Grid - Takes 70% of the space */}
        <div className="w-[70%] h-full overflow-hidden">
          <VideoGrid
            localVideoRef={localVideoRef}
            // @ts-ignore: Ignoring error for users prop
            users={usersWithCurrentUser}
            currentUserId={user.id}
          />
        </div>

        {/* Chat Section - Takes 30% of the space */}
        <div className="w-[30%] h-full flex flex-col bg-gray-800 border-l border-gray-700">
          <div className="p-3 border-b border-gray-700">
            <h3 className="font-medium">Meeting Chat</h3>
          </div>

          <div className="flex-grow overflow-y-auto p-3 space-y-3">
            {formattedChatMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.isCurrentUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-2 ${
                    msg.isCurrentUser ? "bg-blue-600" : "bg-gray-700"
                  }`}
                >
                  <div className="text-xs opacity-70 mb-1">
                    {msg.isCurrentUser ? "You" : msg.sender}
                  </div>
                  <div>{msg.message}</div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} /> {/* Scroll anchor */}
          </div>

          <form
            onSubmit={handleMeetingRoomChatSubmit}
            className="p-3 border-t border-gray-700"
          >
            <div className="flex">
              <input
                type="text"
                value={meetingRoomChatInput}
                onChange={(e) => setMeetingRoomChatInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-grow p-2 bg-gray-700 text-white rounded-l-lg focus:outline-none"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MeetingRoom;
