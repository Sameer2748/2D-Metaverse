import React, { useEffect, useRef, useState } from "react";
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
import { BACKEND_URL, WS_URL } from "../config";
import { toast } from "sonner";

// Main Space Component
const Space = () => {
  const [user, setUser] = useRecoilState(userState);
  const [users, setUsers] = useState(null);
  const { spaceId } = useParams<{ spaceId: string }>();
  const token = localStorage.getItem("token");
  const wstoken = token?.split(" ")[1];
  const {
    notAllowed,
    setNotAllowed,
    popup,
    setShowPopup,
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
    emails:{
    id:string;
    name:string;
    avatarId:string;
    password:string;
    role:string;
    username:string;
    }[]
    creatorId: string;
  } | null>(null);
  const [meetingOne, setMeetingOne] = useState(false);
  // Add these refs to your component
  const activeConnectionsRef = useRef({});
  const activeCallsRef = useRef({});
  // const [isAvailable, setisAvailable] = useState(false);

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
    // Only set up connections when first entering the meeting room
    // or when new users join (meetingRoomUsers changes)
    if (inMeetingRoom && peerInstanceRef.current) {
      // Keep track of connected peers to avoid duplicate connections
      const connectedPeers = new Set(
        Object.keys(activeConnectionsRef.current || {})
      );

      Object.values(meetingRoomUsers).forEach((roomUser) => {
        // Skip if it's the current user or already connected
        if (roomUser.userId === user?.id || !roomUser.peerId) return;
        if (connectedPeers.has(roomUser.peerId)) return;

        // Create peer connection
        const conn = peerInstanceRef.current.connect(roomUser.peerId);

        conn.on("open", async () => {
          try {
            // Store connection for later reference
            activeConnectionsRef.current = {
              ...activeConnectionsRef.current,
              [roomUser.peerId]: conn,
            };

            // Get media stream (reuse existing if available)
            let stream = localStreamRef.current;
            if (!stream) {
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
              });

              // Store stream for later use
              localStreamRef.current = stream;

              // Display local video if element exists
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
              }
            }

            // Call the other user
            const call = peerInstanceRef.current.call(roomUser.peerId, stream);

            // Store call reference to avoid it being garbage collected
            activeCallsRef.current = {
              ...activeCallsRef.current,
              [roomUser.peerId]: call,
            };

            // Handle incoming stream
            call.on("stream", (remoteStream) => {
              // Add this user's stream to our meetingRoomUsers state
              // This will make it accessible to VideoGrid even when hidden
              const updatedUsers = {
                ...meetingRoomUsers,
                [roomUser.userId]: {
                  ...roomUser,
                  stream: remoteStream,
                },
              };

              // Update your state that manages meetingRoomUsers
              setMeetingRoomUsers(updatedUsers);
            });
          } catch (error) {
            console.error("Error setting up meeting room call:", error);
          }
        });
      });
    }

    // check user is allowed or not
    // useEffect(()=>{}
    // },[])

    // Only clean up connections when actually leaving the meeting room
    // NOT when just hiding the UI
    return () => {
      if (!inMeetingRoom) {
        // Clean up connections
        if (activeConnectionsRef.current) {
          Object.values(activeConnectionsRef.current).forEach((conn) => {
            // conn.close();
            (conn as { close: () => void }).close();
          });
        }

        // Clean up calls
        if (activeCallsRef.current) {
          Object.values(activeCallsRef.current).forEach((call) => {
            // call.close();
            (call as { close: () => void }).close();
          });
        }

        // Clean up stream
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
          localStreamRef.current = null;
        }

        // Reset references
        activeConnectionsRef.current = {};
        activeCallsRef.current = {};
      }
    };
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
  useEffect(()=>{
    const UserAllowed = async (userId)=>{
      if(spaceDetails.creatorId !== userId){
        console.log(spaceDetails.emails)
        const isuser = spaceDetails?.emails.some(user => user.id === userId);
        console.log(isuser);
      if(!isuser){
        // alert("You are not allowed to enter this space");
        //  is there any way to set a timer also for how much time i wanna sjhow this toast 
        toast("You are not allowed to enter this space")
        setShowPopup(false);
        setNotAllowed(true);
        setTimeout(()=>{
          window.location.href = "/dashboard";
          setTimeout(()=>{
            setNotAllowed(false);
          }, 1000)
        }, 1000)
        return false;
      }
    }
    return;
    }
    UserAllowed(user?.id);
  }, [user, spaceDetails])

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
      const res = await axios.get(`${BACKEND_URL}/user/metadata`, {
        headers: { authorization: localStorage.getItem("token") },
      });
      console.log(res.data.user);
      await setUser(res.data.user);
      console.log(user);
    };

    const fetchSpaceDetails = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/space/${spaceId}`, {
          headers: {
            Authorization: `${token}`,
          },
        });
        setSpaceDetails(response.data);

        if (response.data.elements.length > 500) {
          setMeetingOne(true);
        }

        const res = await axios.post(
          `${BACKEND_URL}/user/${response.data.creatorId}`,
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
  const { sendMessage } = useWebSocket(`${WS_URL}`, {
    onOpen: () => {
      console.log("WebSocket connection established");

      // Wait for Peer ID before sending the 'join' message
      if (isInitialized && peerId) {
        sendJoinMessage();
      }
      getallUsers()
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
          getallUsers()

          
          // Set other users' positions, explicitly excluding the current user
          setUsersPositions(() => {
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
          getallUsers()

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
          getallUsers()

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

        case "all-users":
          console.log("all users", message.payload);
          setUsers(message.payload.users)
        break;
        default:
          console.warn("Unhandled message type:", message.type);
      }
    },
    shouldReconnect: () => true, // Enable reconnection
  });

  // get all users in this room
  const getallUsers = ()=>{
    sendMessage(
      JSON.stringify({
        type: "all-users",
        payload: {
          spaceId: spaceId
        },
      })
    )
  }

  // Helper function to send the 'join' message
  const sendJoinMessage = () => {
    if (peerId) {
      sendMessage(
        JSON.stringify({
          type: "join",
          payload: {
            spaceId: spaceId,
            token: wstoken,
            peerId, // Include the Peer ID,
            userId: user?.id,
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

    // Check physical meeting room status for previous and new positions
    const wasInMeetingRoomPhysically = isMeetingRoom(
      userPosition.x,
      userPosition.y
    );
    const nowInMeetingRoomPhysically = isMeetingRoom(
      newPosition.x,
      newPosition.y
    );

    // Update the inMeetingRoom flag in position but don't change the actual state yet
    newPosition.inMeetingRoom = nowInMeetingRoomPhysically;

    // Update user position and direction
    setUserPosition(newPosition);
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
          inMeetingRoom: nowInMeetingRoomPhysically,
        },
      })
    );

    // Handle meeting room entry/exit - only send once when crossing the boundary
    if (meetingOne) {
      if (nowInMeetingRoomPhysically !== wasInMeetingRoomPhysically) {
        if (nowInMeetingRoomPhysically) {
          // Entering the meeting room area
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

          // Update the inMeetingRoom state
          setInMeetingRoom(true);

          // End any active one-to-one call when entering meeting room
          if (activeCall) {
            endCall();
          }
        } else {
          // Only send leave-meeting-room when physically leaving the area
          sendMessage(
            JSON.stringify({
              type: "leave-meeting-room",
              payload: {
                userId: user.id,
                spaceId: spaceId,
              },
            })
          );

          // Update the inMeetingRoom state
          setInMeetingRoom(false);

          // Reset the meeting room UI state when leaving the area
          setShowMeetingRoom(false);
        }
      }
    }

    // Handle one-to-one calls when outside the meeting room
    if (nowInMeetingRoomPhysically) {
      // In meeting room - don't manage one-to-one calls here
    } else {
      // Outside meeting room - handle one-to-one calls
      const facingUsers = checkFacingUsers(
        { ...newPosition, direction: newDirection, userId: user.id },
        usersPositions
      );

      if (facingUsers.length > 0) {
        if (!activeCall) {
          startCall(facingUsers[0].peerId);
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
        // setisAvailable(false);
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
      // setisAvailable(true);

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

  const startCall = async (to: string) => {
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

      conn.on("data", (data: { type: string; audio; video }) => {
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
    const localStream = localVideoRef.current?.srcObject as MediaStream | null;
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
        conn.on("data", (data: { type: string; audio; video }) => {
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
        startCall(facingUsers[0].peerId);
      }
      // If we're not facing any users but have an active call, end it
      else if (facingUsers.length === 0 && activeCall) {
        endCall();
      }
    }
  }, [userPosition, userDirection, usersPositions]);

  if (!spaceDetails) {
    return (
      <div className="w-full h-screen flex justify-center items-center text-xl font-semibold bg-gray-600 text-white">
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
    <div className="flex flex-col justify-between items-center h-screen bg-slate-900 p-6 pb-0 text-white">
      {/* top div for showing videos for remote user  */}
      {
        notAllowed && (
          // bl;ur the backgroudn of whole screen
          <div className="w-full h-screen fixed top-0 left-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50"/>
        )
      }
      <Topbar
      spaceId={spaceId}
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
      {popup && (
        <div className="w-full h-full fixed top-0 left-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-[#545c8f] p-6 rounded-xl max-w-3xl relative shadow-2xl border border-[#6c75b5]/30">
            {/* Close button */}
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Header */}
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome to Metaverse
            </h1>

            <p className="text-[#d8daf0] mb-8 text-lg">
              This is a virtual space where you can play, chat, and interact
              with other users. Click on the elements in the grid to see their
              images.
            </p>

            {/* Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-[#454c77] p-4 rounded-lg border border-[#6c75b5]/50">
                <h2 className="text-xl font-bold text-[#a9aed8] mb-2">
                  Navigation
                </h2>
                <p className="text-[#d8daf0] mb-2">Move with arrow keys</p>
                <div className="bg-[#3e4469] p-3 rounded flex justify-center">
                  <div className="grid grid-cols-3 grid-rows-3 gap-1">
                    <div></div>
                    <div className="bg-[#646ca3] p-2 rounded flex justify-center items-center">
                      ↑
                    </div>
                    <div></div>
                    <div className="bg-[#646ca3] p-2 rounded flex justify-center items-center">
                      ←
                    </div>
                    <div className="bg-[#646ca3] p-2 rounded flex justify-center items-center">
                      ↓
                    </div>
                    <div className="bg-[#646ca3] p-2 rounded flex justify-center items-center">
                      →
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#454c77] p-4 rounded-lg border border-[#6c75b5]/50">
                <h2 className="text-xl font-bold text-[#a9aed8] mb-2">
                  Video Chat
                </h2>
                <p className="text-[#d8daf0] mb-2">
                  Face each other to connect, move away to disconnect
                </p>
                <div className="bg-[#3e4469] p-3 rounded flex justify-center items-center h-24">
                  <div className="flex space-x-6">
                    <div className="w-8 h-8 bg-[#7980b7] rounded-full flex items-center justify-center">
                      <span>👤</span>
                    </div>
                    <div className="w-8 h-8 bg-[#3e4469] rounded-full flex items-center justify-center">
                      <span>👤</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#454c77] p-4 rounded-lg border border-[#6c75b5]/50">
                <h2 className="text-xl font-bold text-[#a9aed8] mb-2">
                  Meeting Room
                </h2>
                <p className="text-[#d8daf0] mb-2">
                  Go to bottom left room to enter meeting space
                </p>
                <div className="bg-[#3e4469] p-3 rounded flex justify-center items-center h-24">
                  <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full">
                    <div className="bg-[#454c77] rounded"></div>
                    <div className="bg-[#454c77] rounded"></div>
                    <div className="bg-[#454c77] rounded"></div>
                    <div className="bg-[#454c77] rounded"></div>
                    <div className="bg-[#454c77] rounded"></div>
                    <div className="bg-[#454c77] rounded"></div>
                    <div className="bg-[#7980b7] rounded animate-pulse"></div>
                    <div className="bg-[#454c77] rounded"></div>
                    <div className="bg-[#454c77] rounded"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Get started button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowPopup(false)}
                className="px-6 py-3 bg-[#7980b7] rounded-full text-white font-bold hover:bg-[#8b92c9] transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                Enter Metaverse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* game grid and chat div */}
      <div className={`flex w-full h-5/6 gap-6 items-center ${
    showChat ? "justify-between" : "justify-center"
  }`}>
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
        {/* Chat Interface - Right Side */}
        {showChat ? (
          <div className="w-[35%] h-full">
            <div className="w-[100%] h-[100%] bg-gradient-to-br from-[#545c8f] to-[#3e4469] rounded-xl flex flex-col shadow-xl border border-[#6c75b5]/30 overflow-hidden">
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-[#454c77] to-[#383f66] p-4 border-b border-[#6c75b5]/50 shadow-sm">
                <h1 className="text-center text-xl font-bold text-white tracking-wide">
                  <span className="mr-2">✨</span>
                  All Chat
                  <span className="ml-2">✨</span>
                </h1>
              </div>

              {/* Messages Area with subtle background pattern */}
              <div
                className="flex-grow overflow-y-auto p-4 space-y-4 bg-[#4a5180]/90"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20px 20px, rgba(108, 117, 181, 0.1) 4px, transparent 0)",
                  backgroundSize: "40px 40px",
                }}
              >
                {chatMessages.map((msg, index) => {
                  const isSelf =
                    msg.userId === user?.id || msg.userId === user?.userId;
                  return (
                    <div
                      key={index}
                      className={`p-1 ${
                        isSelf
                          ? "w-full flex justify-end items-end"
                          : "w-full flex justify-start items-end"
                      }`}
                    >
                      {/* Avatar for others' messages */}
                      {!isSelf && (
                        <div className="w-8 h-8 rounded-full bg-[#7980b7] flex items-center justify-center mr-2 text-xs font-bold text-white border-2 border-[#8b92c9]/70 shadow-md">
                          {msg.username?.charAt(0).toUpperCase() || "U"}
                        </div>
                      )}

                      <div
                        className={`flex flex-col ${
                          isSelf
                            ? "bg-gradient-to-br from-[#7980b7] to-[#6c75b5] max-w-[75%] rounded-2xl rounded-tr-none h-auto p-3 shadow-lg"
                            : "bg-gradient-to-br from-[#454c77] to-[#3e4469] max-w-[75%] rounded-2xl rounded-tl-none h-auto p-3 shadow-lg"
                        }`}
                        style={{
                          backdropFilter: "blur(8px)",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div
                          className={`text-xs font-semibold ${isSelf ? "text-[#e0e2f5]" : "text-[#b6bae0]"} mb-1`}
                        >
                          {isSelf ? "You" : msg.username}
                        </div>
                        <div
                          className={`${isSelf ? "text-white" : "text-[#f0f1f9]"} break-words`}
                        >
                          {msg.message}
                        </div>

                        {/* Timestamp with subtle styling */}
                        <div className="text-xs text-[#b6bae0]/70 mt-1 text-right font-light">
                          {new Date().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>

                      {/* Avatar for your messages */}
                      {isSelf && (
                        <div className="w-8 h-8 rounded-full bg-[#8b92c9] flex items-center justify-center ml-2 text-xs font-bold text-white border-2 border-[#9ba1d5]/70 shadow-md">
                          {user?.username?.charAt(0).toUpperCase() || "Y"}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={chatEndRef} /> {/* Scroll anchor */}
              </div>

              {/* Input Form */}
              <div className="p-4 border-t border-[#6c75b5]/30 bg-gradient-to-r from-[#454c77] to-[#383f66]">
                <form onSubmit={handleChatSubmit} className="relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full p-4 pl-5 pr-16 bg-[#3e4469]/90 text-[#f0f1f9] rounded-full focus:outline-none focus:ring-2 focus:ring-[#7980b7]/50 placeholder-[#b6bae0] shadow-inner"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1 bottom-1 px-4 bg-gradient-to-r from-[#7980b7] to-[#6c75b5] text-white rounded-full hover:from-[#8b92c9] hover:to-[#7980b7] transition-all duration-300 font-medium shadow-md flex items-center justify-center"
                  >
                    <span>Send</span>
                    <svg
                      className="w-4 h-4 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-[35%] h-full"></div>
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
          hidemeetingroom={() => setShowMeetingRoom(false)}
          setShowMeetingRoom={() => setShowMeetingRoom(false)}
          setInMeetingRoom={setInMeetingRoom}
        />
      )}

      {/* bottom div for user information */}
      <Bottom
        user={user}
        team={users}
        allTeam={spaceDetails.emails}
        toggleLocalAudio={toggleLocalAudio}
        localMediaState={localMediaState}
        toggleLocalVideo={toggleLocalVideo}
        handleshowChat={handleshowChat}
      />
    </div>
  );
};

export default Space;
