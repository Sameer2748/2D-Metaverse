import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useRecoilState } from "recoil";
import { userState } from "../store/userAtom";
import useWebSocket from "react-use-websocket";
import Peer from "peerjs";
import { AnimatedAvatar, AnimatedAvatar2 } from "./Avatars";
import MeetingRoom from "./MeetingRoom";
import { useSpaceStates } from "../libs/AllStates";
import { AvatarDirection, UserPositionInfo } from "../libs/types";
import { checkFacingUsers, determineDirection } from "../libs/Func";
import Bottom from "./Bottom";
import Topbar from "./Topbar";

// Main Space Component
const Space = () => {
  const [user, setUser] = useRecoilState(userState);

  const { spaceId } = useParams<{ spaceId: string }>();
  const token = localStorage.getItem("token");
  const wstoken = token?.split(" ")[1];
  const {
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
  } = useSpaceStates(user);

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

  // draggable
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
          console.log("got message ", message.payload);
          console.log(meetingRoomChatMessages);
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
          spaceId: spaceId,
        },
      })
    );
    setMeetingRoomChatInput("");
  };

  ///-------------- movement events handlers --------------------------------//

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [userPosition, usersPositions, spaceDetails]);

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

    // Check if the new position is blocked by a static element
    const elementAtNewPosition = spaceDetails.elements.find(
      (el) => el.x === newPosition.x && el.y === newPosition.y
    );

    // Check if the new position is occupied by another user
    const positionOccupied = Object.values(usersPositions).some(
      (pos) => pos.x === newPosition.x && pos.y === newPosition.y
    );

    // If the position is blocked or occupied, stop here
    if (
      (elementAtNewPosition && elementAtNewPosition.element.static) ||
      positionOccupied
    ) {
      return;
    }

    // Check meeting room status for previous and new positions
    const wasInMeetingRoom = userPosition.inMeetingRoom;
    const nowInMeetingRoom = isMeetingRoom(newPosition.x, newPosition.y);

    // Update user position and direction
    setUserPosition({ ...newPosition, inMeetingRoom: nowInMeetingRoom });
    setUserDirection(newDirection);

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

    // Handle meeting room entry/exit - only send once when crossing the boundary
    if (nowInMeetingRoom !== wasInMeetingRoom) {
      if (nowInMeetingRoom) {
        // Entering the meeting room
        sendMessage(
          JSON.stringify({
            type: "enter-meeting-room",
            payload: {
              userId: user.id,
              name: user.name,
              peerId: peerId,
              spaceId: spaceId,
            },
          })
        );

        // End any active one-to-one call when entering meeting room
        if (activeCall) {
          endCall();
        }
      } else {
        // Leaving the meeting room
        sendMessage(
          JSON.stringify({
            type: "leave-meeting-room",
            payload: {
              userId: user.id,
              spaceId: spaceId,
            },
          })
        );
      }
    }

    // Handle one-to-one calls when outside the meeting room
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
      // Get local media stream FIRST, before establishing connection
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Immediately set the local stream to local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log("Local video source set successfully");
      } else {
        console.error("localVideoRef is not available");
        // Create a delayed attempt to set the video source
        setTimeout(() => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            console.log("Local video source set on delayed attempt");
          } else {
            console.error("localVideoRef still not available after delay");
          }
        }, 500);
      }

      // Store the stream in a ref so toggle functions can access it later
      localStreamRef.current = stream;

      // Now connect to the remote peer
      const conn = peerInstanceRef.current.connect(to);
      setActiveConnection(conn);

      conn.on("open", async () => {
        // Make the call to the remote Peer ID with the stream we already acquired
        console.log(to, stream);
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
      <Topbar
        hoveredName={hoveredName}
        spaceDetails={spaceDetails}
        setHoveredName={setHoveredName}
        spaceDetailss={spaceDetailss}
        inMeetingRoom={inMeetingRoom}
        showOtheruser={showOtheruser}
        localVideoRef={localVideoRef}
        localMediaState={localMediaState}
        remoteVideoRef={remoteVideoRef}
        remoteMediaState={remoteMediaState}
      />

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
          spaceId={spaceId}
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
      <Bottom
        user={user}
        toggleLocalAudio={toggleLocalAudio}
        localMediaState={localMediaState}
        toggleLocalVideo={toggleLocalVideo}
        handleshowChat={handleshowChat}
      />
    </div>
  );
};

export default Space;
