import { useState, useRef } from "react";
import {
  AvatarDirection,
  ChatMessage,
  MeetingRoomChatmessage,
  UserPositionInfo,
  MediaState,
  DataConnection,
} from "./types";
import Peer from "peerjs";

export const useSpaceStates = (user: any) => {
  const [userPosition, setUserPosition] = useState<UserPositionInfo>({
    x: 0,
    y: 0,
    direction: AvatarDirection.Front,
    userId: user?.id || "",
    name: user?.name || "",
    Avatar: user?.avatar || "",
    peerId: "",
  });

  const [userDirection, setUserDirection] = useState<AvatarDirection>(
    AvatarDirection.Front
  );
  const [usersPositions, setUsersPositions] = useState<{
    [key: string]: UserPositionInfo;
  }>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [hoveredName, setHoveredName] = useState(false);
  const [spaceDetailss, setSpaceDetailss] = useState<{
    name?: string;
    dimensions: string;
    elements: {
      id: string;
      element: {
        id: string;
        imageUrl: string;
        width: number;
        height: number;
        static: boolean;
      };
      x: number;
      y: number;
    }[];
  } | null>(null);
  const peerInstanceRef = useRef<Peer | null>(null);
  const [peerId, setPeerId] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const videoref = useRef<HTMLVideoElement>(null);

  const [showOtheruser, setshowOtheruser] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef(null);
  const [activeCall, setActiveCall] = useState(null);
  const [showChat, setShowChat] = useState(true);
  const [activeConnection, setActiveConnection] =
    useState<DataConnection | null>(null);
  const [localMediaState, setLocalMediaState] = useState<MediaState>({
    audio: true,
    video: true,
  });
  const [remoteMediaState, setRemoteMediaState] = useState<MediaState>({
    audio: true,
    video: true,
  });
  const localStreamRef = useRef<MediaStream | null>(null);

  // Meeting room states
  const [inMeetingRoom, setInMeetingRoom] = useState(false);
  const [showMeetingRoom, setShowMeetingRoom] = useState(true);
  const [meetingRoomUsers, setMeetingRoomUsers] = useState<{
    [key: string]: UserPositionInfo;
  }>({});
  const [meetingRoomChatMessages, setMeetingRoomChatMessages] = useState<
    MeetingRoomChatmessage[]
  >([]);
  const [meetingRoomChatInput, setMeetingRoomChatInput] = useState("");

  return {
    userPosition,
    setUserPosition,
    userDirection,
    setUserDirection,
    usersPositions,
    setUsersPositions,
    chatMessages,
    setChatMessages,
    chatInput,
    setChatInput,
    chatEndRef,
    hoveredName,
    setHoveredName,
    spaceDetailss,
    setSpaceDetailss,
    peerInstanceRef,
    peerId,
    setPeerId,
    isInitialized,
    setIsInitialized,
    videoref,
    showOtheruser,
    setshowOtheruser,
    localVideoRef,
    remoteVideoRef,
    activeCall,
    setActiveCall,
    showChat,
    setShowChat,
    activeConnection,
    setActiveConnection,
    localMediaState,
    setLocalMediaState,
    remoteMediaState,
    setRemoteMediaState,
    localStreamRef,
    inMeetingRoom,
    setInMeetingRoom,
    showMeetingRoom,
    setShowMeetingRoom,
    meetingRoomUsers,
    setMeetingRoomUsers,
    meetingRoomChatMessages,
    setMeetingRoomChatMessages,
    meetingRoomChatInput,
    setMeetingRoomChatInput,
  };
};
