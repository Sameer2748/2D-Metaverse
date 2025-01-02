import React, {  useEffect, useRef, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import axios from "axios";
import { useRecoilState } from "recoil";
import { userState } from "../store/userAtom";
import useWebSocket from "react-use-websocket";
import Peer, { MediaConnection } from "peerjs";
import { FaSignOutAlt } from "react-icons/fa";
import { AnimatedAvatar, AnimatedAvatar2 } from "./Avatars";

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
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef(null);


  const peerInstanceRef = useRef<Peer | null>(null);
  const [peerId, setPeerId] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const videoref = useRef();
  const [showOtheruser, setshowOtheruser] = useState(false);
  const [activeConnection, setActiveConnection] = useState<MediaConnection>();

  const [activeCall, setActiveCall] = useState(null)

  useEffect(() => {
    // Cleanup function to close existing connections
    return () => {
      if (peerInstanceRef.current) {
        peerInstanceRef.current.destroy();
        peerInstanceRef.current = null;
      }
    };
  }, []);

  // peer for video 
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
          }
        });
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
          setActiveCall(call);

          console.log("answered the stream", stream);

          call.on("stream", (remoteStream) => {
            setshowOtheruser(true)
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
  const { sendMessage } = useWebSocket(
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
      onMessage: async(event) => {
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
            const facingUsers = checkFacingUsers(
              userPosition,
              usersPositions
            );
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
      if (!activeCall) {
        startCall(peerId, facingUsers[0].peerId);
      }
    } else if (activeCall) {
      endCall();
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
  },[]);

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

    // Check if Peer is initialized
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

      // Set the local stream to local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Make the call to the remote Peer ID
      const call = peerInstanceRef.current.call(to, stream);

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

      // Handle call errors
      call.on("error", (err) => {
        console.error("Call error:", err);
      });

      })

      conn.on("data", (data) => {
        if (data.type === "end-call") {
          endCall();
        }
      });
    }  catch (error) {
      console.error("Error in startCall:", error);
      endCall();
    }
  };

  const endCall = async () => {
   // Stop remote video stream
   const remoteStream = remoteVideoRef.current?.srcObject;
   if (remoteStream) {
     remoteStream.getTracks().forEach(track => {
       track.stop();
       console.log("Stopped remote track:", track.kind);
     });
     remoteVideoRef.current.srcObject = null;
   }

   // Send end-call signal to peer if we have an active connection
   if (activeConnection && activeConnection.open) {
     activeConnection.send({ type: "end-call" });
   }

   // Close the call
   if (activeCall) {
     activeCall.close();
     setActiveCall(null);
   }

   // Close the data connection
   if (activeConnection) {
     activeConnection.close();
     setActiveConnection(null);
   }

   setshowOtheruser(false);
 };
  

  /// ----------------------------------------//

  // Render loading state if space details not loaded
  if (!spaceDetails) {
    return <div className="w-full h-screen flex justify-center items-center text-xl font-semibold" >Loading space details...</div>;
  }

  const { dimensions, elements } = spaceDetails;
  const [width, height] = dimensions.split("x").map(Number);

  return (
    <div className="flex flex-col justify-between items-center h-screen bg-[#545c8f] p-6 pb-0">
      {/* top div for showing videos for remote user  */}
      <div className="flex justify-between  w-full">
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
          <div className={`rounded-xl w-[187px] h-[140px] bg-gray-300 ${!showOtheruser && "hidden"}`}>
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

      {/* game grid and chat div */}
      <div className="flex w-full h-4/6 gap-6 flex justify-between items-center">
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
                      <div className="pl-2 pr-2 p-1 text-white bg-black rounded-xl absolute right-[0.2rem] -top-[2.5rem] opacity-[0.7]">You</div>
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
                          <div className="pl-2 pr-2 p-1 text-white bg-black rounded-xl absolute right-[0.2rem] -top-[2.5rem] opacity-[0.7]">{position.name}</div>
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
      </div>

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
        <div className="flex gap-2">
          <button>chat</button>
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
