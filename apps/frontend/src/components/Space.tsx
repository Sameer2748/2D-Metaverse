import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useRecoilState } from "recoil";
import { userState } from "../store/userAtom";
import useWebSocket from "react-use-websocket";
import { MdOutlineLocalOffer } from "react-icons/md";
import Peer from "peerjs";

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
}

// Avatar Sprite Configuration Interface
interface AvatarSprite {
  imageUrl: string;
  width: number;
  height: number;
  spriteColumns: number;
  spriteRows: number;
  animationFrames: number;
}

// Default Avatar Sprite Configuration
const defaultAvatarSprite: AvatarSprite = {
  imageUrl:
    "https://opengameart.org/sites/default/files/styles/medium/public/MainGuySpriteSheet.png", // Replace with your sprite sheet path
  width: 120, // Total width of sprite sheet
  height: 145, // Total height of sprite sheet
  spriteColumns: 3, // Number of columns in sprite sheet
  spriteRows: 4, // Number of rows in sprite sheet
  animationFrames: 2, // Number of animation frames per direction
};
const defaultAvatarSprite2: AvatarSprite = {
  imageUrl:
    "https://opengameart.org/sites/default/files/styles/medium/public/Heroe%20%282%29_1.png", // Replace with your sprite sheet path
  width: 250, // Total width of sprite sheet
  height: 252, // Total height of sprite sheet
  spriteColumns: 4, // Number of columns in sprite sheet
  spriteRows: 4, // Number of rows in sprite sheet
  animationFrames: 2, // Number of animation frames per direction
};

// Animated Avatar Component
const AnimatedAvatar: React.FC<{
  direction: AvatarDirection;
  sprite?: AvatarSprite;
  isMoving?: boolean;
}> = ({ direction, sprite = defaultAvatarSprite, isMoving = false }) => {
  const [currentFrame, setCurrentFrame] = useState(0);

  // Animation frame cycling only when moving
  useEffect(() => {
    let animationInterval: NodeJS.Timeout | null = null;

    if (isMoving) {
      animationInterval = setInterval(() => {
        setCurrentFrame((prev) => (prev + 1) % sprite.animationFrames);
      }, 1000000); // Change frame every 200ms
      setCurrentFrame(0);
    } else {
      // Reset to first frame when not moving
      setCurrentFrame(0);
    }

    return () => {
      if (animationInterval) clearInterval(animationInterval);
    };
  }, [sprite.animationFrames, isMoving]);

  // Calculate sprite sheet position based on direction and frame
  const getSpritePosition = () => {
    let row = 0;
    switch (direction) {
      case AvatarDirection.Front:
        row = 0;
        break;
      case AvatarDirection.Right:
        row = 1;
        break;
      case AvatarDirection.Back:
        row = 2;
        break;
      case AvatarDirection.Left:
        row = 3;
        break;
    }

    return {
      backgroundImage: `url(${sprite.imageUrl})`,
      backgroundPosition: `-${currentFrame * (sprite.width / sprite.spriteColumns)}px -${row * (sprite.height / sprite.spriteRows)}px`,
      width: `${sprite.width / sprite.spriteColumns}px`,
      height: `${sprite.height / sprite.spriteRows}px`,
      backgroundRepeat: "no-repeat",
      position: "relative",
    };
  };

  return (
    <div
      className="avatar-sprite"
      style={{
        ...getSpritePosition(),
        imageRendering: "pixelated",
        transform: "scale(1.5)",
      }}
    />
  );
};
const AnimatedAvatar2: React.FC<{
  direction: AvatarDirection;
  sprite?: AvatarSprite;
  isMoving?: boolean;
}> = ({ direction, sprite = defaultAvatarSprite2, isMoving = false }) => {
  const [currentFrame, setCurrentFrame] = useState(0);

  // Animation frame cycling only when moving
  useEffect(() => {
    let animationInterval: NodeJS.Timeout | null = null;

    if (isMoving) {
      animationInterval = setInterval(() => {
        setCurrentFrame((prev) => (prev + 1) % sprite.animationFrames);
      }, 1000000); // Change frame every 200ms
      setCurrentFrame(0);
    } else {
      // Reset to first frame when not moving
      setCurrentFrame(0);
    }

    return () => {
      if (animationInterval) clearInterval(animationInterval);
    };
  }, [sprite.animationFrames, isMoving]);

  // Calculate sprite sheet position based on direction and frame
  const getSpritePosition = () => {
    let row = 0;
    switch (direction) {
      case AvatarDirection.Front:
        row = 0;
        break;
      case AvatarDirection.Back:
        row = 1;
        break;
      case AvatarDirection.Left:
        row = 2;
        break;
      case AvatarDirection.Right:
        row = 3;
        break;
    }

    return {
      backgroundImage: `url(${sprite.imageUrl})`,
      backgroundPosition: `-${currentFrame * (sprite.width / sprite.spriteColumns)}px -${row * (sprite.height / sprite.spriteRows)}px`,
      width: `${sprite.width / sprite.spriteColumns}px`,
      height: `${sprite.height / sprite.spriteRows}px`,
      backgroundRepeat: "no-repeat",
      position: "relative",
    };
  };

  return (
    <div
      className="avatar-sprite"
      style={{
        ...getSpritePosition(),
        imageRendering: "pixelated",
        transform: "scale(1.5)",
      }}
    />
  );
};

// Main Space Component
const Space = () => {
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
  const [showUsers, setShowUsers] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [localvideo, setLocalVideo] = useState<MediaStream | null>(null);
  const [remotevideo, setremoteVideo] = useState<MediaStream | null>(null);
  const remoteVideoRef = useRef(null);
  const peerInstance = useRef<Peer>(null);
  const [currUserId, setCurrUserId] = useState("");

  const peerInstanceRef = useRef<Peer | null>(null);
  const [peerId, setPeerId] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // useEffect(()=> {
  //   const fetch = async()=>{

  //     const stream = await navigator.mediaDevices.getUserMedia({
  //       video: true,
  //       audio: true,
  //     });
  //     setLocalVideo(stream);
  //   }
  //   fetch()
  // },[])
  

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
    if (!peerInstanceRef.current) {
      const peer = new Peer();

      peer.on("open", (id) => {
        console.log("Peer ID:", id);
        setPeerId(id);
        peerInstanceRef.current = peer; // Assign to ref
        setIsInitialized(true); // Mark Peer as initialized
      });

      peer.on("call", async (call) => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });

          // Set the local stream to local video element
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          call.answer(stream); // Answer the incoming call with local media stream

          console.log("answered the stream", stream);

          call.on("stream", (remoteStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          });
        } catch (error) {
          console.error("Error answering call:", error);
        }
      });

      peer.on("error", (error) => {
        console.error("Peer error:", error);
      });
    }
  }, []);

  //user metadata space details
  useEffect(() => {
    const fetch = async () => {
      const res = await axios.get(
        "http://localhost:3000/api/v1/user/metadata",
        { headers: { authorization: localStorage.getItem("token") } }
      );
      console.log(res.data.user);
      setCurrUserId(res.data.user.id);
      setUser(res.data.user);
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
  const { sendMessage, lastJsonMessage, readyState } = useWebSocket(
    `ws://localhost:3001`,
    {
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
      onMessage: (event) => {
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
            setUsersPositions((prev) => ({
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

          default:
            console.warn("Unhandled message type:", message.type);
        }
      },
      shouldReconnect: () => true, // Enable reconnection
    }
  );

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
  const handleKeyDown = (event: KeyboardEvent) => {
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

    const facingUsers = checkFacingUsers(
      { ...newPosition, direction: newDirection, userId: user.id },
      usersPositions
    );

    if (facingUsers.length > 0) {
      console.log("Current User Position:", userPosition);
      console.log("Users Positions:", usersPositions);
      console.log("Users facing each other:", facingUsers);
      startCall(peerId, facingUsers[0].peerId);
    }else{
      endCall();
    }
  };
  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        console.log("Available devices:", devices);
      })
      .catch((err) => {
        console.error("Error enumerating devices:", err);
      });
  }, []);

  const MAX_RETRIES = 5; // Maximum retry attempts
const RETRY_INTERVAL = 2000; // Time (ms) between retries

const getVideoDevice = async () => {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevice = devices.find(device => device.kind === "videoinput");

      if (videoDevice) {
        console.log("Video device found:", videoDevice.label);
        return videoDevice;
      } else {
        console.warn("No video device found. Retrying...");
        retries++;
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
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
      video: { deviceId: videoDevice.deviceId ? { exact: videoDevice.deviceId } : undefined },
      audio: true,
    };

    // Check if Peer is initialized
    if (!peerInstanceRef.current || !isInitialized) {
      console.error("Peer instance not initialized yet");
      return;
    }

    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Set the local stream to local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Make the call to the remote Peer ID
      const call = peerInstanceRef.current.call(to, stream);

      // Listen for the remote stream
      call.on("stream", (remoteStream) => {
        console.log("Received remote stream");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      // Handle call errors
      call.on("error", (err) => {
        console.error("Call error:", err);
      });
    } catch (error) {
      console.error("Error in startCall:", error);
    }
  };

  const endCall = async()=>{
    const existingStream2= remoteVideoRef.current?.srcObject;
    if (existingStream2) {
      existingStream2.getTracks().forEach(track => track.stop());
    }
  }

  /// ----------------------------------------//

  // Render loading state if space details not loaded
  if (!spaceDetails) {
    return <div>Loading space details...</div>;
  }

  const { dimensions, elements } = spaceDetails;
  const [width, height] = dimensions.split("x").map(Number);

  return (
    <div className="flex flex-col justify-between items-center h-screen bg-[#545c8f] p-6">
      <div className="flex justify-between   w-full">
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
        <div className="flex justfy-between items-center gap-4">
          <div className="rounded-xl w-[250px]  h-[140px] bg-gray-300">
            <video
              className="rounded-xl"
              ref={localVideoRef}
              autoPlay
              muted
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          <div className="rounded-xl w-[250px] h-[140px] bg-gray-300">
            <video
              className="rounded-xl"
              ref={remoteVideoRef}
              autoPlay
              muted
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>
        {/* <div>
        {
          showUsers && (
            <div className="absolute mt-12 right-7 w-auto h-auto bg-red-500 flex flex-col justify-center items-center z-[99] rounded-xl">
             {Object.entries(usersPositions).map(([userId, userInfo]) => {
              console.log(userInfo);
              
                      return (
                        <div
                          key={userId}
                          className="text-white p-2"
                        >
                          {userInfo.name}
                        </div>
                      );
                    
                  })}
            </div>
          )
        }
        <div className="relative w-[80px] h-[40px] rounded-xl bg-gray-400 p-2 flex justify-center items-center cursor-pointer" onClick={()=> setShowUsers((prev) => !prev)}>
          <p>Users: 0</p>
        </div>
      </div> */}
      </div>

      <div className="flex w-full h-4/5 gap-6 flex justify-between items-center">
        {/* Game Grid */}
        <div
          className="w-[80%] h-full mr-4 overflow-auto border-2 border-white rounded-lg"
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

              return (
                <div key={index} className="w-10 h-10 bg-black relative">
                  {elementAtCell && (
                    <img
                      src={elementAtCell.element.imageUrl}
                      alt={`Element at (${x}, ${y})`}
                      className="w-full h-full object-cover"
                    />
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
        <div className="w-[55%] h-full ">
          <h1 className="text-center text-xl mb-2">Space Chat</h1>
          <div className="w-[100%] h-[92%] bg-gray-800 rounded-lg flex flex-col ">
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
      </div>
    </div>
  );
};

export default Space;
