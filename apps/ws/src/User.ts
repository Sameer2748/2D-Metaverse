import { WebSocket, WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { JWT_PASSWORD } from './config';
import client from '@metaverse/db/client';

interface User {
  id: string;
  userId: string;
  spaceId: string;
  ws: WebSocket;
  position: { x: number; y: number };
  name:string;
}

interface ChatMessage {
  type: 'chat';
  payload: {
    userId: string;
    message: string;
    timestamp: number;
    username?: string;
  };
}

class UserManager {
  private users: Map<string, User> = new Map();
  private spaceUsers: Map<string, Set<string>> = new Map();

  addUser(user: User) {
    this.users.set(user.id, user);
    
    if (!this.spaceUsers.has(user.spaceId)) {
      this.spaceUsers.set(user.spaceId, new Set());
    }
    this.spaceUsers.get(user.spaceId)?.add(user.id);
  }

  removeUser(userId: string) {
    const user = this.users.get(userId);
    if (user) {
      this.spaceUsers.get(user.spaceId)?.delete(userId);
      this.users.delete(userId);
    }
  }

  getUsersInSpace(spaceId: string): { userId: string, position: { x: number; y: number } }[] {
    const userIds = this.spaceUsers.get(spaceId) || new Set();
    return Array.from(userIds)
      .map(id => this.users.get(id))
      .filter(Boolean)
      .map(user => ({
        userId: user!.userId,
        position: user!.position,
        name: user!.name
      }));
  }

  findUserByWebSocket(ws: WebSocket): User | undefined {
    return Array.from(this.users.values()).find(u => u.ws === ws);
  }



  broadcastToSpace(spaceId: string, message: any, excludeUserId?: string) {
    const users = Array.from(this.users.values()).filter(
      user => user.spaceId === spaceId && user.userId !== excludeUserId
    );
    
    users.forEach(user => {
      user.ws.send(JSON.stringify(message));
    });
  }

  broadcastChatMessage(spaceId: string, message: ChatMessage) {
    const users = Array.from(this.users.values()).filter(
      user => user.spaceId === spaceId
    );
    
    users.forEach(user => {
    //   console.log(JSON.stringify(message));
      user.ws.send(JSON.stringify(message));
    });
  }
}

const userManager = new UserManager();

function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 12);
}

function setupWebSocketServer(wss: WebSocketServer) {
  wss.on('connection', (ws) => {
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'join':
            const { spaceId, token } = message.payload;
            
            // Verify token
            const decoded = jwt.verify(token, JWT_PASSWORD) as { userId: string };
            if (!decoded.userId) {
              ws.close();
              return;
            }

            // Check if user is already connected
            const existingUserInSpace = Array.from(userManager.users.values()).find(
              user => user.userId === decoded.userId && user.spaceId === spaceId
            );

            // If user is already connected, close the existing connection
            if (existingUserInSpace) {
              // Close the existing WebSocket
              existingUserInSpace.ws.close();
              
              // Remove the existing user from the user manager
              userManager.removeUser(existingUserInSpace.id);
            }

            // Fetch space with elements
            const space = await client.space.findUnique({
              where: { id: spaceId },
              include: {
                elements: {
                  include: {
                    element: true
                  }
                }
              }
            });

            if (!space) {
              ws.close();
              return;
            }

            // Generate spawn position
            const spawnPosition = calculateSpawnPosition(spaceId, space);

            // Fetch user details to get username
            const userData = await client.user.findUnique({
              where: { id: decoded.userId }
            });

            // Create user
            const user: User = {
              id: generateUniqueId(),
              userId: decoded.userId,
              spaceId,
              ws,
              position: spawnPosition,
              name:userData?.name
            };

            userManager.addUser(user);

            const allusers = userManager.getUsersInSpace(spaceId);
            // console.log("allusers",allusers);
            

            // Send spawn position to the joining user
            ws.send(JSON.stringify({
              type: 'space-joined',
              payload: {
                spawn: spawnPosition,
                newUserPositions: allusers,
                username: userData?.username,
                name: userData?.name
              }
            }));

            // Broadcast user joined to other users in the space
            userManager.broadcastToSpace(spaceId, {
              type: 'user-joined',
              payload: {
                userId: decoded.userId,
                position: spawnPosition,
                username: userData?.name,
                name: userData?.name
              }
            });
            break;

          case 'movement':
                const { x, y, direction } = message.payload;
                const existingUser2 = userManager.findUserByWebSocket(ws);
                
                if (existingUser2) {
                  // Fetch space with elements
                  const space = await client.space.findUnique({
                    where: { id: existingUser2.spaceId },
                    include: {
                      elements: {
                        include: {
                          element: true
                        }
                      }
                    }
                  });
              
                  if (!space) {
                    console.error(`Space not found for id: ${existingUser2.spaceId}`);
                    return;
                  }
              
                  // Check space bounds
                  if (x < 0 || x >= space.width || y < 0 || y >= space.height) {
                    console.warn(`Invalid movement outside space bounds: (${x}, ${y})`);
                    return;
                  }
              
                  // Check for static elements
                  const staticElements = space.elements.filter((el) => el.element.static);
              
                  const isStaticElement = staticElements.some((el) => 
                    el.x === x && el.y === y
                  );
              
                  if (isStaticElement) {
                    console.warn(`Cannot move to static element at: (${x}, ${y})`);
                    return;
                  }
              
                  // Check for other users
                  const usersInSpace = userManager.getUsersInSpace(existingUser2.spaceId);
                  const isOccupiedByUser = usersInSpace.some(user => 
                    user.userId !== existingUser2.userId && 
                    user.position.x === x && 
                    user.position.y === y
                  );
              
                  if (isOccupiedByUser) {
                    console.warn(`Cannot move to position occupied by another user: (${x}, ${y})`);
                    return;
                  }
              
                  // Update user position
                  existingUser2.position = { x, y };
              
                  // Broadcast movement to other users in the space, excluding the moving user
                //   console.log(x,y , direction);
                  
                  userManager.broadcastToSpace(existingUser2.spaceId, {
                    type: 'movement',
                    payload: {
                      userId: existingUser2.userId,
                      position: { x, y },
                      direction: direction ,
                    }
                  }, existingUser2.userId);  // Pass the user ID to exclude
                }
                break;
          case 'chat':
            const existingUser = userManager.findUserByWebSocket(ws);
            
            if (existingUser) {
              // Fetch user details to get username
              const userData = await client.user.findUnique({
                where: { id: existingUser.userId }
              });

              // Validate message payload
              if (!message.payload || !message.payload.message) {
                console.warn('Invalid chat message');
                return;
              }

              // Create chat message object
              const chatMessage: ChatMessage = {
                type: 'chat',
                payload: {
                  userId: existingUser.userId,
                  message: message.payload.message,
                  timestamp: Date.now(),
                  username: userData?.username
                  
                }
              };

              // Broadcast chat message to all users in the space
              userManager.broadcastChatMessage(existingUser.spaceId, chatMessage);
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket error:', error);
        ws.close();
      }
    });

    ws.on('close', () => {
      const user = userManager.findUserByWebSocket(ws);
      if (user) {
        // Broadcast user left to other users in the space
        userManager.broadcastToSpace(user.spaceId, {
          type: 'user-left',
          payload: {
            userId: user.userId
          }
        });

        // Remove user
        userManager.removeUser(user.id);
      }
    });
  });
}

// Update calculateSpawnPosition to work with the new space object structure
function calculateSpawnPosition(spaceId: string, space: any): { x: number; y: number } {
  // Add null/undefined check for space
  if (!space) {
    console.error(`No space found for spaceId: ${spaceId}`);
    return { x: 0, y: 0 };
  }

  // Use width and height properties directly
  const width = space.width;
  const height = space.height;

  // Validate dimensions
  if (!width || !height || width <= 0 || height <= 0) {
    console.error(`Invalid space dimensions: width=${width}, height=${height}`);
    return { x: 0, y: 0 };
  }
  
  // Get existing users in the space
  const usersInSpace = userManager.getUsersInSpace(spaceId);
  const occupiedPositions = new Set(
    usersInSpace.map(u => `${u.position.x},${u.position.y}`)
  );

  // Add static elements to occupied positions
  const staticElements = space.elements
    .filter((el: any) => el.element.static)
    .map((el: any) => `${el.x},${el.y}`);
  
  staticElements.forEach((pos: string) => occupiedPositions.add(pos));

  // Find an unoccupied position
  let x, y;
  let attempts = 0;
  const maxAttempts = width * height; // Prevent infinite loop

  do {
    x = Math.floor(Math.random() * width);
    y = Math.floor(Math.random() * height);
    
    attempts++;
    
    // Prevent infinite loop if no positions are available
    if (attempts > maxAttempts) {
      console.warn(`Could not find unoccupied position after ${maxAttempts} attempts`);
      return { x: 0, y: 0 };
    }
  } while (occupiedPositions.has(`${x},${y}`));

  return { x, y };
}

export { setupWebSocketServer };