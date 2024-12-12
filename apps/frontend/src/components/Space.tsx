import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useRecoilState } from "recoil";
import { userState } from "../store/userAtom";

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
  username?: string;
  userId: string;
  Avatar?: string;
  name:string;
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

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [userPosition, setUserPosition] = useState<UserPositionInfo>({
    x: 0,
    y: 0,
    direction: AvatarDirection.Front,
    userId: user?.id || "",
    name: user?.name || "",
    Avatar: user?.avatar || "",
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
  const [showUsers , setShowUsers] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const res = await axios.get(
        "http://localhost:3000/api/v1/user/metadata",
        { headers: { authorization: localStorage.getItem("token") } }
      );
      setUser(res.data.user);
    };
    fetch();
  }, []);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // WebSocket and Space Details Fetch
  useEffect(() => {
    let socket: WebSocket | null = null;

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

    const reconnectWebSocket = () => {
      socket = new WebSocket(`ws://localhost:3001`);
      setWs(socket);

      socket.onopen = () => {
        console.log("WebSocket connection established");
        socket.send(
          JSON.stringify({
            type: "join",
            payload: {
              spaceId: spaceId,
              token: wstoken,
            },
          })
        );
      };

      socket.onmessage = async (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case "space-joined":
            setUserPosition(message.payload.spawn);
            
            setUsersPositions((prev) => {
              const newPositions: { [key: string]: any } = {};
              message.payload.newUserPositions.forEach((userPos: any) => {
                if (userPos.userId !== user?.id) {
                  newPositions[userPos.userId] = {
                    x: userPos.position.x,
                    y: userPos.position.y,
                    direction: AvatarDirection.Front,
                    username: userPos.username,
                    name: userPos.name
                  };
                }
              });
              return newPositions; 
            });
            break;
          case "movement":
            const newPosition = message.payload.position;
            console.log(message.payload.direction);

            setUsersPositions((prev) => ({
              ...prev,
              [message.payload.userId]: {
                ...newPosition,
                direction: message.payload.direction, // This is already being set
                username: message.payload.username,
                name: message.payload.name
              },
            }));

            break;
          case "chat":
            setChatMessages((prev) => [...prev, message.payload]);
            console.log(message);
            break;
          case "user-left":
            const newPositions = { ...usersPositions };
            delete newPositions[message.payload.userId];
            setUsersPositions(newPositions);
            break;
          default:
            break;
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setTimeout(reconnectWebSocket, 1000);
      };
    };

    reconnectWebSocket();

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [spaceId, token]);

  // Handle Chat Submit
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!chatInput.trim()) return;

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "chat",
          payload: {
            message: chatInput,
          },
        })
      );

      setChatInput("");
    }
  };

  const checkAndLogFacingUsers = (
    currentUser: UserPositionInfo,
    usersPositions: Record<string, UserPositionInfo>
  ): void => {
    // Determine the position the current user is facing
    let targetX = currentUser.x;
    let targetY = currentUser.y;
  
    switch (currentUser.direction) {
      case AvatarDirection.Right:
        targetX += 1;
        break;
      case AvatarDirection.Left:
        targetX -= 1;
        break;
      case AvatarDirection.Front:
        targetY += 1;
        break;
      case AvatarDirection.Back:
        targetY -= 1;
        break;
    }
  
    // Check if a user exists at the target position
    const targetUser = Object.values(usersPositions).find(
      (user) => user.x === targetX && user.y === targetY
    );
  
    if (targetUser) {
      // Check if the users are facing each other
      const isFacingEachOther =
        (currentUser.direction === AvatarDirection.Right &&
          targetUser.direction === AvatarDirection.Left) ||
        (currentUser.direction === AvatarDirection.Left &&
          targetUser.direction === AvatarDirection.Right) ||
        (currentUser.direction === AvatarDirection.Front &&
          targetUser.direction === AvatarDirection.Back) ||
        (currentUser.direction === AvatarDirection.Back &&
          targetUser.direction === AvatarDirection.Front);
  
      if (isFacingEachOther) {
        console.log("Users facing each other:");
        console.log("User 1:", {
          id: currentUser.userId,
          username: currentUser.username,
          position: { x: currentUser.x, y: currentUser.y },
          direction: currentUser.direction
        });
        console.log("User 2:", {
          id: targetUser.userId,
          username: targetUser.username,
          position: { x: targetUser.x, y: targetUser.y },
          direction: targetUser.direction
        });
      }
    }
  };

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
  
  // Handle Key Down for Movement
  const handleKeyDown = (event: KeyboardEvent) => {
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
    ) {
      event.preventDefault();
    }

    if (!spaceDetails) return;

    // current user position
    const prevPosition = { ...userPosition };
    let newPosition = { ...userPosition };
    // storing userdirection for changing direction of current user facing
    let newDirection = userDirection;

    // checking the key and fic the newposition of user and direction
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


    // cheking thedirection of use based on prevposition and newposition
    newDirection = determineDirection(prevPosition, newPosition);

    // cheking i there is any other user present or not 
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

    // Check if there are any users facing each other and log them
    checkAndLogFacingUsers(
      { ...userPosition, direction: newDirection, userId: user?.id || '' }, 
      usersPositions
    );

    setUserPosition(newPosition);
    setUserDirection(newDirection);

    // send movement to websocket for sending to all users
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "movement",
          payload: {
            x: newPosition.x,
            y: newPosition.y,
            direction: newDirection,
          },
        })
      );
    }
   
  };

  // Listen for keydown event
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [userPosition, ws, usersPositions, spaceDetails]);

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
        <div className="rounded-xl w-[250px] h-[140px] bg-gray-300"></div>
        <div className="rounded-xl w-[250px] h-[140px] bg-gray-300"></div>
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
