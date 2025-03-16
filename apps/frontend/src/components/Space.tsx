import React, { SetStateAction, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useRecoilState } from "recoil";
import { userState } from "../store/userAtom";
import useWebSocket from "react-use-websocket";
import Peer, { MediaConnection } from "peerjs";
import { FaSignOutAlt } from "react-icons/fa";
import { AnimatedAvatar, AnimatedAvatar2 } from "./Avatars";
import { BsChatLeftText } from "react-icons/bs";
import MeetingRoom from "./MeetingRoom";

// Avatar Direction Enum
enum AvatarDirection {
  Front = "front",
  Back = "back",
  Left = "left",
  Right = "right",
}

// ChatMessage Interface
interface ChatMessage {
  userId: string;
  message: string;
  timestamp: number;
}

interface UserPositionInfo {
  x: number;
  y: number;
  direction: AvatarDirection;
  userId: string;
  username?: string;
  name?: string;
  peerId?: string;
  Avatar?: string;
  inMeetingRoom?: boolean;
}

interface MediaState {
  audio: boolean;
  video: boolean;
}

// Main Space Component
const Space = () => {
  const navigate = useNavigate();
  const [user, setUser] = useRecoilState(userState);

  const { spaceId } = useParams<{ spaceId: string }>();
  const token = localStorage.getItem("token");
  const wstoken = token?.split(" ")[1];

  const [spaceDetails, setSpaceDetails] = useState<{
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
  const [spaceDetailss, setSpaceDetailss] = useState({});

  const peerInstanceRef = useRef<Peer | null>(null);
  const [peerId, setPeerId] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const videoref = useRef();
  const [showOtheruser, setshowOtheruser] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef(null);
  const [activeCall, setActiveCall] = useState(null);
  const [showChat, setShowChat] = useState(true);
  const [activeConnection, setActiveConnection] =
    useState<SetStateAction<null>>();

  const [localMediaState, setLocalMediaState] = useState<MediaState>({
    audio: true,
    video: true,
  });
  const [remoteMediaState, setRemoteMediaState] = useState<MediaState>({
    audio: true,
    video: true,
  });
  const localStreamRef = useRef<MediaStream | null>(null);

  //meeting room states
  // Add these new state variables
  const [inMeetingRoom, setInMeetingRoom] = useState(false);
  const [showMeetingRoom, setShowMeetingRoom] = useState(true);
  const [meetingRoomUsers, setMeetingRoomUsers] = useState<{
    [key: string]: UserPositionInfo;
  }>({});
  const [meetingRoomChatMessages, setMeetingRoomChatMessages] = useState<
    ChatMessage[]
  >([]);
  const [meetingRoomChatInput, setMeetingRoomChatInput] = useState("");

  // Add this to your component
  const isMeetingRoom = (x: number, y: number) => {
    // Define the gate coordinates (adjust based on your map)
    const gateX = 13; // Approximate x-coordinate based on your screenshot
    const gateY = 15; // Approximate y-coordinate based on your screenshot

    // Check if user is at or has passed through the gate
    const check = x <= gateX && y >= gateY;
    console.log(check);
    if (!check && inMeetingRoom) {
      sendMessage(
        JSON.stringify({
          type: "leave-meeting-room",
          payload: { userId: user.id },
        })
      );
    }
    return x <= gateX && y >= gateY;
  };

  //  peer connection to all user ion the chat room
  useEffect(() => {
    if (inMeetingRoom) {
      // Connect to all users in the meeting room
      Object.values(meetingRoomUsers).forEach((roomUser) => {
        // Skip if it's the current user or already connected
        if (roomUser.userId === user?.id) return;

        // Create peer connection
        const conn = peerInstanceRef.current.connect(roomUser.peerId);
        conn.on("open", async () => {
          try {
            // Get media stream
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });

            // Store stream for later use
            localStreamRef.current = stream;

            // Display local video
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }

            // Call the other user
            const call = peerInstanceRef.current.call(roomUser.peerId, stream);

            // Handle incoming stream
            call.on("stream", (remoteStream) => {
              // Create or find video element for this user
              let videoEl = document.getElementById(
                `meeting-video-${roomUser.userId}`
              );
              if (!videoEl) {
                videoEl = document.createElement("video");
                videoEl.id = `meeting-video-${roomUser.userId}`;
                videoEl.autoplay = true;
                document
                  .getElementById("meeting-videos-container")
                  .appendChild(videoEl);
              }

              videoEl.srcObject = remoteStream;
            });
          } catch (error) {
            console.error("Error setting up meeting room call:", error);
          }
        });
      });
    } else {
      // Clean up video connections when leaving meeting room
      // (similar to your existing endCall function)
      const meetingVideosContainer = document.getElementById(
        "meeting-videos-container"
      );
      if (meetingVideosContainer) {
        const videoElements =
          meetingVideosContainer.querySelectorAll("video:not([muted])");
        videoElements.forEach((videoEl) => {
          if (videoEl.srcObject) {
            const stream = videoEl.srcObject;
            if (stream instanceof MediaStream) {
              stream.getTracks().forEach((track) => track.stop());
            }
            videoEl.srcObject = null;
          }
          if (videoEl.id !== "local-video") {
            videoEl.remove();
          }
        });
      }
    }
  }, [inMeetingRoom, meetingRoomUsers]);

  // Function to toggle local audio
  const toggleLocalAudio = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      const audioTrack = stream.getAudioTracks()[0];

      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setLocalMediaState((prev) => ({ ...prev, audio: audioTrack.enabled }));
      }
    }
  };

  const toggleLocalVideo = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      const videoTrack = stream.getVideoTracks()[0];

      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setLocalMediaState((prev) => ({ ...prev, video: videoTrack.enabled }));
      }
    }
  };

  useEffect(() => {
    // Cleanup function to close existing connections
    return () => {
      if (peerInstanceRef.current) {
        peerInstanceRef.current.destroy();
        peerInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Declare these variables in the outer scope so they're accessible in cleanup
    let isDragging = false;
    let offsetX, offsetY;
    let draggableDiv = null;

    // Define event handlers outside so they can be referenced in cleanup
    function startDrag(e) {
      isDragging = true;

      // Calculate the offset of the mouse pointer relative to the div
      const rect = draggableDiv.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      // Prevent any default behavior
      e.preventDefault();
    }

    function handleTouchStart(e) {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousedown", {
          clientX: touch.clientX,
          clientY: touch.clientY,
        });
        startDrag(mouseEvent);
      }
      e.preventDefault();
    }

    function drag(e) {
      if (!isDragging) return;

      // Update the position of the div based on mouse/touch position
      draggableDiv.style.left = `${e.clientX - offsetX}px`;
      draggableDiv.style.top = `${e.clientY - offsetY}px`;

      e.preventDefault();
    }

    function handleTouchMove(e) {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousemove", {
          clientX: touch.clientX,
          clientY: touch.clientY,
        });
        drag(mouseEvent);
      }
      e.preventDefault();
    }

    function endDrag() {
      isDragging = false;
    }

    // Setup function
    function setupDirectDraggable() {
      draggableDiv = document.querySelector(".videodiv");

      if (!draggableDiv) {
        console.error("Draggable div not found");
        // Try again after a short delay
        setTimeout(setupDirectDraggable, 500);
        return;
      }

      // Make the div position absolute so it can be moved freely
      draggableDiv.style.position = "absolute";
      draggableDiv.style.cursor = "move";
      draggableDiv.style.zIndex = "1000"; // Ensure it's on top

      // Set initial position
      draggableDiv.style.top = "20px";
      draggableDiv.style.left = "500px";

      // Event listeners for mouse/touch interactions - directly on the div
      draggableDiv.addEventListener("mousedown", startDrag);
      draggableDiv.addEventListener("touchstart", handleTouchStart, {
        passive: false,
      });

      // Add event listeners to document to track movement and release
      document.addEventListener("mousemove", drag);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("mouseup", endDrag);
      document.addEventListener("touchend", endDrag);
    }

    // Call setup
    setupDirectDraggable();

    // Clean up event listeners when component unmounts
    return () => {
      // Find the div again in case it was null earlier
      if (!draggableDiv) {
        draggableDiv = document.querySelector(".videodiv");
      }

      if (draggableDiv) {
        draggableDiv.removeEventListener("mousedown", startDrag);
        draggableDiv.removeEventListener("touchstart", handleTouchStart);
      }

      document.removeEventListener("mousemove", drag);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("mouseup", endDrag);
      document.removeEventListener("touchend", endDrag);
    };
  }, []);

  //user metadata space details
  useEffect(() => {
    const fetch = async () => {
      const res = await axios.get(
        "http://localhost:3000/api/v1/user/metadata",
        { headers: { authorization: localStorage.getItem("token") } }
      );
      console.log(res.data.user);
      await setUser(res.data.user);
      console.log(user);
    };

    const fetchSpaceDetails = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/v1/space/${spaceId}`,
          {
            headers: {
              Authorization: `${token}`,
            },
          }
        );
        setSpaceDetails(response.data);

        const res = await axios.post(
          `http://localhost:3000/api/v1/user/${response.data.creatorId}`,
          {},
          {
            headers: {
              Authorization: `${token}`,
            },
          }
        );
        setSpaceDetailss(res.data.user);
      } catch (error) {
        console.error("Error fetching space details:", error);
      }
    };

    fetchSpaceDetails();
    fetch();
  }, []);

  // WebSocket setup
  const { sendMessage } = useWebSocket(`ws://localhost:3001`, {
    onOpen: () => {
      console.log("WebSocket connection established");

      // Wait for Peer ID before sending the 'join' message
      if (isInitialized && peerId) {
        sendJoinMessage();
      }
    },
    onClose: () => {
      console.log("WebSocket connection closed, retrying...");
    },
    onMessage: async (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "space-joined":
          // Set the current user's position
          setUserPosition(message.payload.spawn);

          // Set other users' positions, explicitly excluding the current user
          setUsersPositions((prev) => {
            const updatedPositions: { [key: string]: UserPositionInfo } = {};

            message.payload.newUserPositions.forEach((userPos) => {
              // Only add other users, not the current user
              if (userPos.userId !== user?.id) {
                updatedPositions[userPos.userId] = {
                  x: userPos.position.x,
                  y: userPos.position.y,
                  direction: AvatarDirection.Front,
                  userId: userPos.userId,
                  name: userPos.name,
                  peerId: userPos.peerId,
                };
              }
            });

            return updatedPositions;
          });
          break;

        case "user-joined":
          // Only add the new user if it's not the current user
          if (message.payload.userId !== user?.id) {
            setUsersPositions((prev) => ({
              ...prev,
              [message.payload.userId]: {
                x: message.payload.position.x,
                y: message.payload.position.y,
                direction: AvatarDirection.Front,
                userId: message.payload.userId,
                name: message.payload.name,
                peerId: message.payload.peerId,
              },
            }));
          }
          break;
        case "movement":
          await setUsersPositions((prev) => ({
            ...prev,
            [message.payload.userId]: {
              x: message.payload.position.x,
              y: message.payload.position.y,
              direction: message.payload.direction,
              userId: message.payload.userId,
              name: message.payload.name, // Add name
              peerId: message.payload.peerId,
            },
          }));
          const facingUsers = checkFacingUsers(userPosition, usersPositions);
          console.log(facingUsers.length);

          break;

        case "chat":
          setChatMessages((prev) => [...prev, message.payload]);
          break;

        case "user-left":
          setUsersPositions((prev) => {
            const updatedPositions = { ...prev };
            delete updatedPositions[message.payload.userId];
            return updatedPositions;
          });
          break;

        case "enter-meeting-room":
          // Add user to meeting room users
          setMeetingRoomUsers((prev) => ({
            ...prev,
            [message.payload.userId]: {
              userId: message.payload.userId,
              name: message.payload.name,
              peerId: message.payload.peerId,
            },
          }));

          // If this is about the current user, update their status
          if (message.payload.userId === user?.id) {
            setInMeetingRoom(true);
          }
          break;

        case "leave-meeting-room":
          // Remove user from meeting room users
          setMeetingRoomUsers((prev) => {
            const updated = { ...prev };
            delete updated[message.payload.userId];
            return updated;
          });

          // If this is about the current user, update their status
          if (message.payload.userId === user?.id) {
            setInMeetingRoom(false);
          }
          break;

        case "meeting-room-users":
          // Update the full list of meeting room users (sent when joining)
          setMeetingRoomUsers(message.payload.users);
          break;

        case "meeting-room-chat":
          // Handle meeting room specific chat messages
          setMeetingRoomChatMessages((prev) => [...prev, message.payload]);
          break;
        default:
          console.warn("Unhandled message type:", message.type);
      }
    },
    shouldReconnect: () => true, // Enable reconnection
  });

  // Helper function to send the 'join' message
  const sendJoinMessage = () => {
    if (peerId) {
      sendMessage(
        JSON.stringify({
          type: "join",
          payload: {
            spaceId: spaceId,
            token: wstoken,
            peerId, // Include the Peer ID
          },
        })
      );
      console.log("Join message sent with Peer ID:", peerId);
    } else {
      console.warn("Peer ID is not yet available!");
    }
  };

  // Resend 'join' message when Peer ID is set
  useEffect(() => {
    if (isInitialized && peerId) {
      sendJoinMessage();
    }
  }, [isInitialized, peerId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Handle Chat Submit
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!chatInput.trim()) return;

    sendMessage(
      JSON.stringify({
        type: "chat",
        payload: {
          message: chatInput,
        },
      })
    );
    setChatInput("");
  };
  // dynamic meeting room chat messages
  const handleMeetingRoomChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!meetingRoomChatInput.trim()) return;

    sendMessage(
      JSON.stringify({
        type: "meeting-room-chat",
        payload: {
          message: meetingRoomChatInput,
          sender: user?.name || "Unknown",
          senderId: user?.id,
        },
      })
    );
    setMeetingRoomChatInput("");
  };

  // const StartCall = async (from: string, to: string) => {
  //   console.log("Inside StartCall");

  //   PeerConnection.setRemoteUserId(to);
  //   console.log("local stream", localStream);

  //   try {
  //     const pc = await PeerConnection.getInstance();

  //     const offer = await pc.createOffer();
  //     await pc.setLocalDescription(offer);

  //     // Store the offer
  //     setStoredOffer(offer);

  //     // Send the offer via signaling (e.g., WebSocket)
  //     sendMessage(
  //       JSON.stringify({
  //         type: "offer",
  //         payload: {
  //           from,
  //           to,
  //           offer: pc.localDescription, // Always send the latest description
  //         },
  //       })
  //     );
  //   } catch (error) {
  //     console.error("Error in StartCall:", error);
  //     cleanupCall();
  //   }
  // };

  // const cleanupCall = () => {
  //   // // Stop local stream tracks

  //   // Stop remote stream tracks
  //   if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
  //     const remoteStream = remoteVideoRef.current.srcObject as MediaStream;
  //     remoteStream.getTracks().forEach((track) => track.stop());
  //     remoteVideoRef.current.srcObject = null;
  //   }

  //   // Reset peer connection
  //   PeerConnection.resetInstance();
  // };

  //-----------------------------------//

  ///-------------- movement events handlers --------------------------------//
  const determineDirection = (
    prevPosition: { x: number; y: number },
    newPosition: { x: number; y: number }
  ): AvatarDirection => {
    const dx = newPosition.x - prevPosition.x;
    const dy = newPosition.y - prevPosition.y;

    if (dx > 0) return AvatarDirection.Right;
    if (dx < 0) return AvatarDirection.Left;
    if (dy > 0) return AvatarDirection.Front;
    if (dy < 0) return AvatarDirection.Back;

    return AvatarDirection.Front; // Default
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [userPosition, usersPositions, spaceDetails]);

  const checkFacingUsers = (
    currentUser: UserPositionInfo,
    otherUsers: { [key: string]: UserPositionInfo }
  ): { userId: string; name: string; peerId: string }[] => {
    const facingUsers: any = [];

    for (const [userId, otherUser] of Object.entries(otherUsers)) {
      if (!otherUser) continue;

      // Determine the opposite direction for each facing scenario
      const oppositeFacingMap = {
        [AvatarDirection.Right]: AvatarDirection.Left,
        [AvatarDirection.Left]: AvatarDirection.Right,
        [AvatarDirection.Front]: AvatarDirection.Back,
        [AvatarDirection.Back]: AvatarDirection.Front,
      };

      // Check if users are truly adjacent (next to each other)
      const isAdjacent =
        (Math.abs(currentUser.x - otherUser.x) === 1 &&
          currentUser.y === otherUser.y) ||
        (Math.abs(currentUser.y - otherUser.y) === 1 &&
          currentUser.x === otherUser.x);

      // Check if users are facing each other using the opposite direction map
      const isFacing =
        currentUser.direction === oppositeFacingMap[otherUser.direction] &&
        // Horizontal facing
        ((currentUser.direction === AvatarDirection.Right &&
          currentUser.x + 1 === otherUser.x &&
          currentUser.y === otherUser.y) ||
          (currentUser.direction === AvatarDirection.Left &&
            currentUser.x - 1 === otherUser.x &&
            currentUser.y === otherUser.y) ||
          // Vertical facing
          (currentUser.direction === AvatarDirection.Front &&
            currentUser.y + 1 === otherUser.y &&
            currentUser.x === otherUser.x) ||
          (currentUser.direction === AvatarDirection.Back &&
            currentUser.y - 1 === otherUser.y &&
            currentUser.x === otherUser.x));

      if (isAdjacent && isFacing) {
        facingUsers.push({
          userId,
          name: otherUser.name || otherUser.username || "Unknown User",
          peerId: otherUser.peerId,
        });
      }
    }

    return facingUsers;
  };
  const handleKeyDown = async (event: KeyboardEvent) => {
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
    ) {
      event.preventDefault();
    }

    if (!spaceDetails) return;

    const prevPosition = { ...userPosition };
    let newPosition = { ...userPosition };
    let newDirection = userDirection;

    switch (event.key) {
      case "ArrowUp":
        newPosition.y = Math.max(0, userPosition.y - 1);
        newDirection = AvatarDirection.Back;
        break;
      case "ArrowDown":
        newPosition.y = Math.min(
          parseInt(spaceDetails.dimensions.split("x")[1], 10) - 1 || 0,
          userPosition.y + 1
        );
        newDirection = AvatarDirection.Front;
        break;
      case "ArrowLeft":
        newPosition.x = Math.max(0, userPosition.x - 1);
        newDirection = AvatarDirection.Left;
        break;
      case "ArrowRight":
        newPosition.x = Math.min(
          parseInt(spaceDetails.dimensions.split("x")[0], 10) - 1 || 0,
          userPosition.x + 1
        );
        newDirection = AvatarDirection.Right;
        break;
      default:
        return;
    }

    newDirection = determineDirection(prevPosition, newPosition);

    const elementAtNewPosition = spaceDetails.elements.find(
      (el) => el.x === newPosition.x && el.y === newPosition.y
    );

    if (
      (elementAtNewPosition && elementAtNewPosition.element.static) ||
      Object.values(usersPositions).some(
        (pos) => pos.x === newPosition.x && pos.y === newPosition.y
      )
    ) {
      return;
    }

    setUserPosition(newPosition);
    setUserDirection(newDirection);

    const wasInMeetingRoom = userPosition.inMeetingRoom;
    const nowInMeetingRoom = isMeetingRoom(newPosition.x, newPosition.y);

    // Check if meeting room status changed
    if (nowInMeetingRoom !== wasInMeetingRoom) {
      // Update user position with meeting room status
      newPosition.inMeetingRoom = nowInMeetingRoom;

      // Send WebSocket message about meeting room status change
      sendMessage(
        JSON.stringify({
          type: nowInMeetingRoom ? "enter-meeting-room" : "leave-meeting-room",
          payload: {
            userId: user.id,
            name: user.name,
            peerId: peerId,
          },
        })
      );

      // End any active one-to-one call when entering meeting room
      if (nowInMeetingRoom && activeCall) {
        endCall();
      }

      // If entering meeting room, show alert
      // if (nowInMeetingRoom) {
      //   alert("You have entered the meeting room!");
      // }
    }

    // Send movement data
    sendMessage(
      JSON.stringify({
        type: "movement",
        payload: {
          x: newPosition.x,
          y: newPosition.y,
          direction: newDirection,
          peerId,
        },
      })
    );

    if (!nowInMeetingRoom) {
      const facingUsers = checkFacingUsers(
        { ...newPosition, direction: newDirection, userId: user.id },
        usersPositions
      );

      if (facingUsers.length > 0) {
        if (!activeCall) {
          startCall(peerId, facingUsers[0].peerId);
        }
      } else if (activeCall) {
        endCall();
      }
    }
  };

  useEffect(() => {
    const videoAvailable = navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        console.log("Available devices:", devices);
      })
      .catch((err) => {
        console.error("Error enumerating devices:", err);
      });
  }, []);

  // set the current user video in bottom navbar
  useEffect(() => {
    const checkVideo = async () => {
      const videoDevice = await getVideoDevice();

      if (!videoDevice) {
        setisAvailable(false);
        console.log("No video device available. Please check your hardware.");
        return;
      }
      const constraints = {
        video: {
          deviceId: videoDevice.deviceId
            ? { exact: videoDevice.deviceId }
            : undefined,
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setisAvailable(true);

      // Set the local stream to local video element
      if (videoref.current) {
        videoref.current.srcObject = stream;
      }
    };
    checkVideo();
  }, []);

  const MAX_RETRIES = 2; // Maximum retry attempts
  const RETRY_INTERVAL = 1000; // Time (ms) between retries

  const getVideoDevice = async () => {
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevice = devices.find(
          (device) => device.kind === "videoinput"
        );

        if (videoDevice) {
          console.log("Video device found:", videoDevice.label);
          return videoDevice;
        } else {
          console.warn("No video device found. Retrying...");
          retries++;
          await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
        }
      } catch (error) {
        console.error("Error checking devices:", error);
        return null;
      }
    }

    console.error("Failed to find video device after retries.");
    return null;
  };

  const startCall = async (from: string, to: string) => {
    const videoDevice = await getVideoDevice();

    if (!videoDevice) {
      alert("No video device available. Please check your hardware.");
      return;
    }

    const constraints = {
      video: {
        deviceId: videoDevice.deviceId
          ? { exact: videoDevice.deviceId }
          : undefined,
      },
      audio: true,
    };

    if (!peerInstanceRef.current || !isInitialized) {
      console.error("Peer instance not initialized yet");
      return;
    }

    try {
      const conn = peerInstanceRef.current.connect(to);
      setActiveConnection(conn);

      conn.on("open", async () => {
        // Get local media stream
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        // Store the stream in a ref so toggle functions can access it later
        localStreamRef.current = stream;

        // Set the local stream to local video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Make the call to the remote Peer ID
        const call = peerInstanceRef.current.call(to, stream);
        setActiveCall(call);

        // Listen for the remote stream
        call.on("stream", (remoteStream) => {
          console.log("Received remote stream");
          setshowOtheruser(true);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });
        call.on("close", () => {
          endCall();
        });
        call.on("error", (err) => {
          console.error("Call error:", err);
        });
      });

      conn.on("data", (data) => {
        if (data.type === "end-call") {
          endCall();
        } else if (data.type === "media-state-change") {
          alert("Changing media controls");
          // Update remote peer's media state in our UI
          setRemoteMediaState({
            audio: data.audio,
            video: data.video,
          });
        }
      });
    } catch (error) {
      console.error("Error in startCall:", error);
      endCall();
    }
  };

  const endCall = async () => {
    console.log("Ending call");

    // Stop local video stream
    const localStream = localVideoRef.current?.srcObject;
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped local track:", track.kind);
      });
      localVideoRef.current.srcObject = null;
    }

    // Stop remote video stream
    const remoteStream = remoteVideoRef.current?.srcObject;
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped remote track:", track.kind);
      });
      remoteVideoRef.current.srcObject = null;
    }

    // Send end-call signal to peer if we have an active connection
    if (activeConnection && activeConnection.open) {
      try {
        activeConnection.send({ type: "end-call" });
        console.log("Sent end-call signal to peer");
      } catch (error) {
        console.error("Error sending end-call signal:", error);
      }
    }

    // Close the call
    if (activeCall) {
      try {
        activeCall.close();
        console.log("Closed active call");
      } catch (error) {
        console.error("Error closing call:", error);
      }
      setActiveCall(null);
    }

    // Close the data connection
    if (activeConnection) {
      try {
        activeConnection.close();
        console.log("Closed active connection");
      } catch (error) {
        console.error("Error closing connection:", error);
      }
      setActiveConnection(null);
    }
    setLocalMediaState({ audio: true, video: true });
    setRemoteMediaState({ audio: true, video: true });
    setshowOtheruser(false);
  };

  useEffect(() => {
    if (!peerInstanceRef.current) {
      const peer = new Peer();

      peer.on("open", (id) => {
        console.log("Peer ID:", id);
        setPeerId(id);
        peerInstanceRef.current = peer; // Assign to ref
        setIsInitialized(true); // Mark Peer as initialized
      });
      peer.on("connection", (conn) => {
        conn.on("data", (data) => {
          if (data.type === "end-call") {
            endCall();
          } else if (data.type === "media-state-change") {
            alert("changing media controls ");
            // Update remote peer's media state in our UI
            setRemoteMediaState({
              audio: data.audio,
              video: data.video,
            });
          }
        });
      });

      peer.on("call", async (call) => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });

          // Store the stream reference
          localStreamRef.current = stream;

          // Set the local stream to local video element
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          // Answer the call with the local media stream
          call.answer(stream);
          setActiveCall(call);

          console.log("Answered the call with stream", stream);

          call.on("stream", (remoteStream) => {
            setshowOtheruser(true);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          });
          call.on("close", () => {
            console.log("Call closed by peer");
            endCall();
          });
        } catch (error) {
          console.error("Error answering call:", error);
        }
      });

      peer.on("error", (error) => {
        console.error("Peer error:", error);
      });
    }
    return () => {
      if (peerInstanceRef.current) {
        endCall();
        peerInstanceRef.current.destroy();
      }
    };
  }, []);

  // Add this effect to constantly check facing status after each movement
  useEffect(() => {
    // Only check if we have a position and there are other users
    if (userPosition && Object.keys(usersPositions).length > 0) {
      const facingUsers = checkFacingUsers(
        { ...userPosition, direction: userDirection, userId: user.id },
        usersPositions
      );

      // If we're facing users and don't have an active call, start one
      if (facingUsers.length > 0 && !activeCall) {
        startCall(peerId, facingUsers[0].peerId);
      }
      // If we're not facing any users but have an active call, end it
      else if (facingUsers.length === 0 && activeCall) {
        endCall();
      }
    }
  }, [userPosition, userDirection, usersPositions]);

  if (!spaceDetails) {
    return (
      <div className="w-full h-screen flex justify-center items-center text-xl font-semibold">
        Loading space details...
      </div>
    );
  }

  const { dimensions, elements } = spaceDetails;
  const [width, height] = dimensions.split("x").map(Number);

  const handleshowChat = () => {
    setShowChat((prev) => !prev);
  };

  return (
    <div className="flex flex-col justify-between items-center h-screen bg-[#545c8f] p-6 pb-0">
      {/* top div for showing videos for remote user  */}
      <div className="flex justify-between  w-full ">
        <div>
          {hoveredName && (
            <div
              className="absolute  mt-8 w-auto p-3 h-auto bg-white rounded-xl text-black"
              style={{ zIndex: 99 }}
            >
              Space name: {spaceDetails.name}
              <h1>CreatedBy: {spaceDetailss.name} </h1>
            </div>
          )}
          <h1
            className="text-xl font-semibold cursor-pointer relative"
            onMouseOver={() => setHoveredName(true)}
            onMouseLeave={() => setHoveredName(false)}
          >
            {spaceDetails.name}
          </h1>
        </div>
        <div className="videodiv flex justfy-between items-center gap-4">
          {!inMeetingRoom && (
            <div
              className={`w-full flex gap-4 ${!showOtheruser && "justify-center"}`}
            >
              {/* Remote video */}
              {showOtheruser && (
                <>
                  {/* Local video */}
                  <div className="relative w-1/2 max-w-[200px]">
                    <video
                      className="rounded-xl w-full h-full object-cover"
                      ref={localVideoRef}
                      autoPlay
                      muted
                    />
                    {!localMediaState.video && (
                      <div className="absolute inset-0 bg-blue-500 bg-opacity-80 flex items-center justify-center rounded-xl">
                        <span className="text-white font-medium">
                          Camera Off
                        </span>
                      </div>
                    )}
                    {!localMediaState.audio && (
                      <div className="absolute bottom-2 right-2 bg-red-500 p-1 rounded-full">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-white"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                            clipRule="evenodd"
                          />
                          <path d="M3 3l14 14" stroke="white" strokeWidth="2" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-xs">
                      You
                    </div>
                  </div>
                  <div className="relative w-1/2 max-w-[200px]">
                    <video
                      className="rounded-xl w-full h-full object-cover"
                      ref={remoteVideoRef}
                      autoPlay
                    />
                    {!remoteMediaState.video && (
                      <div className="absolute inset-0 bg-blue-500 bg-opacity-80 flex items-center justify-center rounded-xl">
                        <span className="text-white font-medium">
                          Camera Off
                        </span>
                      </div>
                    )}
                    {!remoteMediaState.audio && (
                      <div className="absolute bottom-2 right-2 bg-red-500 p-1 rounded-full">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-white"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                            clipRule="evenodd"
                          />
                          <path d="M3 3l14 14" stroke="white" strokeWidth="2" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-xs">
                      Remote
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* game grid and chat div */}
      <div className="flex w-full h-5/6 gap-6 flex justify-between items-center">
        {/* Game Grid */}
        <div
          className="w-[80%] h-full mr-4 overflow-auto  rounded-lg"
          tabIndex={0}
          style={{ outline: "none" }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${width}, 40px)`,
              gridTemplateRows: `repeat(${height}, 40px)`,
              margin: "auto",
            }}
          >
            {Array.from({ length: width * height }).map((_, index) => {
              const x = index % width;
              const y = Math.floor(index / width);

              const elementAtCell = elements.find(
                (el) => el.x === x && el.y === y
              );
              const isMeetingTable = x === 9 && y === 17; // Adjust these coordinates based on your actual grid

              // Only show the button on this table if the user is in the meeting area
              const showMeetingButton = isMeetingTable && inMeetingRoom;

              return (
                <div key={index} className="w-10 h-10 bg-black relative">
                  {elementAtCell && (
                    <img
                      src={elementAtCell.element.imageUrl}
                      alt={`Element at (${x}, ${y})`}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Meeting Room Button on specific table */}
                  {showMeetingButton && (
                    <button
                      className="absolute top-2 right-2 w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center z-10 cursor-pointer shadow-lg transform transition-all duration-300 hover:scale-110 animate-bounce"
                      onClick={() => {
                        setShowMeetingRoom(true);
                      }}
                      style={{
                        animation: "bounce 1s infinite",
                      }}
                    >
                      <span className="font-bold text-lg">M</span>
                    </button>
                  )}
                  {/* Current User Avatar */}
                  {userPosition.x === x && userPosition.y === y && (
                    <div
                      className="absolute"
                      style={{
                        top: "30%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <div className="pl-2 pr-2 p-1 text-white bg-black rounded-xl absolute right-[0.2rem] -top-[2.5rem] opacity-[0.7]">
                        You
                      </div>
                      <AnimatedAvatar
                        direction={userDirection}
                        isMoving={Object.values(usersPositions).some(
                          (pos) =>
                            pos.x !== userPosition.x || pos.y !== userPosition.y
                        )}
                      />
                    </div>
                  )}

                  {/* Other Users' Avatars */}
                  {Object.entries(usersPositions).map(([userId, position]) => {
                    if (
                      position.x === x &&
                      position.y === y &&
                      userId !== user?.id
                    ) {
                      return (
                        <div
                          key={userId}
                          className="absolute"
                          style={{
                            top: "30%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          {/* Name bubble */}
                          <div
                            className="
            inline-block
            w-auto
            whitespace-nowrap
            px-2 py-1
            text-white
            bg-black
            bg-opacity-70
            rounded-xl
            absolute
            -top-10
            left-1/2
            transform
            -translate-x-1/2
          "
                          >
                            {position.name}
                          </div>

                          {/* Avatar */}
                          <AnimatedAvatar2
                            direction={position.direction}
                            isMoving={true}
                          />
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Interface - Right Side */}
        {showChat ? (
          <div className="w-[35%] h-full ">
            {/* <h1 className="text-center text-xl mb-2">Space Chat</h1> */}
            <div className="w-[100%] h-[100%] bg-gray-800 rounded-lg flex flex-col ">
              <div className="flex-grow overflow-y-auto p-2 space-y-2">
                {chatMessages.map((msg, index) => {
                  const isSelf =
                    msg.userId === user?.id || msg.userId === user?.userId;
                  return (
                    <div
                      key={index}
                      className={`p-2 rounded-lg ${
                        isSelf
                          ? " text-white w-full flex justify-end items-center"
                          : " text-white w-full flex justify-start items-center"
                      }`}
                    >
                      <div
                        className={`flex flex-col ${msg.userId === user?.id ? "w-auto max-w-[80%] bg-gray-600 justify-end rounded-xl h-auto p-2 " : "w-auto bg-gray-600 justify-end rounded-xl h-auto p-2"}`}
                      >
                        <div className="text-xs text-gray-300">
                          {isSelf ? "You" : msg.username}
                        </div>
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} /> {/* Scroll anchor */}
              </div>

              <form
                onSubmit={handleChatSubmit}
                className="p-4 border-t border-gray-700"
              >
                <div className="flex w-full justify-between items-center">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-grow p-2 bg-gray-700 text-white rounded-l-lg focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="w-[35%] h-full "> </div>
        )}
      </div>
      {inMeetingRoom && showMeetingRoom && (
        <MeetingRoom
          user={user}
          inMeetingRoom={inMeetingRoom}
          meetingRoomUsers={meetingRoomUsers}
          meetingRoomChatMessages={meetingRoomChatMessages}
          meetingRoomChatInput={meetingRoomChatInput}
          setMeetingRoomChatInput={setMeetingRoomChatInput}
          handleMeetingRoomChatSubmit={handleMeetingRoomChatSubmit}
          sendMessage={sendMessage}
          localVideoRef={localVideoRef}
          hidemeetingroom={() => setInMeetingRoom(false)}
          setShowMeetingRoom={() => setShowMeetingRoom(false)}
        />
      )}

      {/* bottom div for user information */}
      <div
        className="w-screen  flex justify-between items-center h-[55px] pl-4 pr-4"
        style={{ backgroundColor: "rgb(27 32 66)" }}
      >
        <div className="flex justify-center items-center gap-2">
          {/* // homme image gather go to home */}
          <div
            className="w-[40px] h-[40px] bg-black rounded-xl flex items-center justify-center  cursor-pointer  ml-4 mr-2"
            style={{ backgroundColor: "rgb(27 32 66)" }}
          >
            <svg
              className="w-[30px] h-[30px]"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M5.022 1.07a.698.698 0 01.273-.974.762.762 0 011.016.26l1.58 2.625c.02.003.041.008.062.013l3.636.934a.711.711 0 01.526.874c-.107.38-.514.607-.911.505L7.92 4.463l-.879 3.145c-.106.381-.514.607-.911.505a.71.71 0 01-.526-.874l.974-3.486a.726.726 0 01.02-.063L5.023 1.07zm7.707 11.385c1.434-.793 1.925-2.552 1.097-3.927-.828-1.375-2.662-1.846-4.095-1.052-1.434.794-1.926 2.552-1.098 3.927.828 1.375 2.662 1.846 4.096 1.052zm-.775-1.26c.709-.393.952-1.262.542-1.943-.41-.68-1.316-.913-2.026-.52-.71.392-.952 1.262-.543 1.943.41.68 1.317.913 2.027.52zm-4.359.795c.828 1.376.337 3.134-1.097 3.928-1.434.793-3.268.322-4.096-1.053-.828-1.375-.337-3.133 1.097-3.927s3.268-.323 4.096 1.052zm-1.341.7c.41.68.166 1.55-.543 1.943-.71.393-1.617.16-2.027-.521-.41-.68-.166-1.55.543-1.943.71-.393 1.617-.16 2.027.52zm6.993 7.088c1.434-.794 1.925-2.552 1.097-3.927-.828-1.376-2.662-1.847-4.096-1.053-1.434.794-1.925 2.552-1.097 3.927.828 1.375 2.662 1.846 4.096 1.053zm-.799-1.293c.71-.393.952-1.263.543-1.943-.41-.68-1.317-.913-2.026-.52-.71.392-.953 1.262-.543 1.942.41.68 1.317.914 2.026.521zm8.148 1.202c.828 1.375.337 3.134-1.097 3.927-1.434.794-3.268.323-4.096-1.052-.828-1.375-.337-3.133 1.097-3.927s3.268-.323 4.096 1.052zm-1.331.715c.41.68.166 1.55-.543 1.943-.71.393-1.617.16-2.027-.52-.41-.68-.166-1.55.543-1.943.71-.393 1.617-.16 2.027.52zm.236-4.087c1.434-.793 1.925-2.552 1.097-3.927-.828-1.375-2.662-1.846-4.096-1.052-1.434.794-1.925 2.552-1.097 3.927.828 1.375 2.662 1.846 4.096 1.053zm-.748-1.267c.71-.393.952-1.263.543-1.943-.41-.68-1.317-.914-2.027-.521-.71.393-.952 1.263-.542 1.943.41.68 1.316.913 2.026.52zm1.327-9.982c.828 1.375.337 3.133-1.097 3.927s-3.268.323-4.096-1.052c-.828-1.375-.336-3.134 1.098-3.927 1.434-.794 3.267-.323 4.095 1.052zm-1.34.69c.409.68.166 1.55-.544 1.943-.709.392-1.616.16-2.026-.521-.41-.68-.167-1.55.543-1.943.71-.393 1.617-.16 2.026.52z"
                fill="currentColor"
              ></path>
            </svg>
          </div>
          <div
            className="flex w-auto h-[45px] flex items-center justify-between  pr-2 rounded-xl m-1 cursor-pointer"
            style={{ backgroundColor: "rgb(117 126 197)" }}
          >
            <div className="rounded-xl w-[50px] flex items-center justify-center ">
              <img
                style={{ borderRadius: "10px" }}
                width={40}
                height={30}
                src="data:image/jpeg;base64,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"
                alt=""
              />
            </div>
            {/* {isAvailable ? (
              <div className=" w-[60px] flex items-center justify-center ">
                <video
                  className="rounded-xl"
                  ref={videoref}
                  autoPlay
                  muted
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            ) : (
              <div className="rounded-xl w-[50px] flex items-center justify-center ">
                <img
                  style={{ borderRadius: "10px" }}
                  width={40}
                  height={30}
                  src="data:image/jpeg;base64,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"
                  alt=""
                />
              </div>
            )} */}
            <div className="bg-black w-[1px] h-[45px]" />
            <div className="pl-2">
              <p className="text-sm">{user.name}</p>
              <p className="text-sm">{user.username}</p>
            </div>
          </div>
        </div>
        {/* video containers */}
        <div className="mt-4 flex gap-4 justify-center">
          <button
            onClick={toggleLocalAudio}
            className={`p-2 rounded-full ${localMediaState.audio ? "bg-gray-200" : "bg-red-500"}`}
          >
            {localMediaState.audio ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1V8a1 1 0 011-1h1.586l4.707-4.707C10.923 1.663 12 2.109 12 3v18c0 .891-1.077 1.337-1.707.707L5.586 17H4a1 1 0 01-1-1v-1z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            )}
          </button>
          <button
            onClick={toggleLocalVideo}
            className={`p-2 rounded-full ${localMediaState.video ? "bg-gray-200" : "bg-red-500"}`}
          >
            {localMediaState.video ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            )}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleshowChat}
            className="mr-10 flex gap-2 justify-center items-center"
          >
            <BsChatLeftText size={25} />
          </button>
          <div className="bg-gray-400 w-[1px] h-[35px]" />
          <button onClick={() => navigate("/")}>
            <FaSignOutAlt size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Space;
