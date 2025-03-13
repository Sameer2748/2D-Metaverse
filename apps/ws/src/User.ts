import { WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "./config";
import client from "@metaverse/db/client";

interface User {
  id: string;
  userId: string;
  spaceId: string;
  ws: WebSocket;
  position: { x: number; y: number };
  name: string;
  peerId: string;
  isGuest?: boolean;
}

interface ChatMessage {
  type: "chat";
  payload: {
    userId: string;
    message: string;
    timestamp: number;
    username?: string;
  };
}

interface GuestTokenPayload {
  userId: string;
  isGuest: boolean;
  guestName: string;
}

// Space cache to store space details
class SpaceCache {
  private spaces: Map<string, any> = new Map();
  private cacheTTL: number = 60 * 60 * 1000; // 1 hour TTL
  private lastUpdated: Map<string, number> = new Map();

  async getSpace(spaceId: string): Promise<any> {
    const now = Date.now();
    const cachedSpace = this.spaces.get(spaceId);
    const lastUpdatedTime = this.lastUpdated.get(spaceId) || 0;

    // If space exists in cache and hasn't expired
    if (cachedSpace && now - lastUpdatedTime < this.cacheTTL) {
      console.log(`Using cached space data for ${spaceId}`);
      return cachedSpace;
    }

    // Fetch from database
    console.log(`Fetching space ${spaceId} from database`);
    const space = await client.space.findUnique({
      where: { id: spaceId },
      include: {
        elements: {
          include: {
            element: true,
          },
        },
      },
    });

    // Update cache
    if (space) {
      this.spaces.set(spaceId, space);
      this.lastUpdated.set(spaceId, now);
    }

    return space;
  }

  invalidateCache(spaceId: string) {
    this.spaces.delete(spaceId);
    this.lastUpdated.delete(spaceId);
  }
}

class UserManager {
  public users: Map<string, User> = new Map();
  private spaceUsers: Map<string, Set<string>> = new Map();

  addUser(user: User) {
    // Remove any existing entries for this user in the same space
    const existingUsers = Array.from(this.users.values()).filter(
      (existingUser) =>
        existingUser.userId === user.userId &&
        existingUser.spaceId === user.spaceId
    );

    existingUsers.forEach((existingUser) => {
      this.removeUser(existingUser.id);
    });

    // Add the new user
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
      console.log(`Removed user ${userId} from space ${user.spaceId}`);
    }
  }

  getUsersInSpace(spaceId: string): {
    userId: string;
    position: { x: number; y: number };
    peerId: string;
    name: string;
    isGuest?: boolean;
  }[] {
    const userIds = this.spaceUsers.get(spaceId) || new Set();
    return Array.from(userIds)
      .map((id) => this.users.get(id))
      .filter(Boolean)
      .map((user) => ({
        userId: user!.userId,
        position: user!.position,
        name: user!.name,
        peerId: user!.peerId,
        isGuest: user!.isGuest,
      }));
  }

  findUserByWebSocket(ws: WebSocket): User | undefined {
    return Array.from(this.users.values()).find((u) => u.ws === ws);
  }

  findUserByUserId(userId: string, spaceId: string): User | undefined {
    return Array.from(this.users.values()).find(
      (user) => user.userId === userId && user.spaceId === spaceId
    );
  }

  broadcastToSpace(spaceId: string, message: any, excludeUserId?: string) {
    const users = Array.from(this.users.values()).filter(
      (user) => user.spaceId === spaceId && user.userId !== excludeUserId
    );

    users.forEach((user) => {
      user.ws.send(JSON.stringify(message));
    });
  }

  broadcastChatMessage(spaceId: string, message: ChatMessage) {
    const users = Array.from(this.users.values()).filter(
      (user) => user.spaceId === spaceId
    );

    users.forEach((user) => {
      user.ws.send(JSON.stringify(message));
    });
  }
}

const userManager = new UserManager();
const spaceCache = new SpaceCache();

function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 12);
}

async function fetchSpace(spaceId: string) {
  return await spaceCache.getSpace(spaceId);
}

function setupWebSocketServer(wss: WebSocketServer) {
  wss.on("connection", (ws) => {
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case "join":
            const { spaceId, token, peerId, isGuest, guestName } =
              message.payload;

            let userId: string;
            let name: string;

            if (isGuest) {
              // Handle guest user
              userId = `guest-${token}`; // Using the guest token as userId
              name = guestName;
            } else {
              // Handle regular user
              try {
                const decoded = jwt.verify(token, JWT_PASSWORD) as {
                  userId: string;
                };
                if (!decoded.userId) {
                  ws.close();
                  return;
                }
                userId = decoded.userId;

                // Fetch user details from database
                const userData = await client.user.findUnique({
                  where: { id: userId },
                });
                name = userData?.name || "Anonymous";
              } catch (error) {
                console.error("Token verification failed:", error);
                ws.close();
                return;
              }
            }

            // Fetch space with elements
            const space = await fetchSpace(spaceId);
            if (!space) {
              ws.close();
              return;
            }

            // Find and remove existing connections
            const existingConnections = Array.from(
              userManager.users.values()
            ).filter(
              (user) => user.userId === userId && user.spaceId === spaceId
            );

            existingConnections.forEach((existingUser) => {
              try {
                existingUser.ws.close();
              } catch (error) {
                console.error("Error closing existing connection:", error);
              }
              userManager.removeUser(existingUser.id);
            });

            // Generate spawn position
            const spawnPosition = calculateSpawnPosition(spaceId, space);

            // Create user object
            const user: User = {
              id: generateUniqueId(),
              userId,
              spaceId,
              ws,
              position: spawnPosition,
              name,
              peerId,
              isGuest: isGuest || false,
            };

            userManager.addUser(user);

            const allUsers = userManager.getUsersInSpace(spaceId);

            // Send join confirmation
            ws.send(
              JSON.stringify({
                type: "space-joined",
                payload: {
                  spawn: spawnPosition,
                  newUserPositions: allUsers.map((user) => ({
                    userId: user.userId,
                    position: user.position,
                    name: user.name,
                    peerId: user.peerId,
                    isGuest: user.isGuest,
                  })),
                  userId,
                  name,
                  peerId,
                  isGuest,
                },
              })
            );

            // Broadcast new user to others
            userManager.broadcastToSpace(
              spaceId,
              {
                type: "user-joined",
                payload: {
                  userId,
                  position: spawnPosition,
                  name,
                  peerId,
                  isGuest,
                },
              },
              userId
            );
            break;

          case "movement":
            const { x, y, direction } = message.payload;
            const movingUser = userManager.findUserByWebSocket(ws);

            if (movingUser) {
              const space = await fetchSpace(movingUser.spaceId);

              if (!space) {
                console.error(`Space not found for id: ${movingUser.spaceId}`);
                return;
              }

              // Check space bounds
              if (x < 0 || x >= space.width || y < 0 || y >= space.height) {
                console.warn(
                  `Invalid movement outside space bounds: (${x}, ${y})`
                );
                return;
              }

              // Check for static elements
              const staticElements = space.elements.filter(
                (el) => el.element.static
              );

              const isStaticElement = staticElements.some(
                (el) => el.x === x && el.y === y
              );

              if (isStaticElement) {
                console.warn(`Cannot move to static element at: (${x}, ${y})`);
                return;
              }

              // Check for other users
              const usersInSpace = userManager.getUsersInSpace(
                movingUser.spaceId
              );
              const isOccupiedByUser = usersInSpace.some(
                (user) =>
                  user.userId !== movingUser.userId &&
                  user.position.x === x &&
                  user.position.y === y
              );

              if (isOccupiedByUser) {
                console.warn(
                  `Cannot move to position occupied by another user: (${x}, ${y})`
                );
                return;
              }

              // Update user position
              movingUser.position = { x, y };

              // Broadcast movement to other users
              userManager.broadcastToSpace(
                movingUser.spaceId,
                {
                  type: "movement",
                  payload: {
                    userId: movingUser.userId,
                    position: { x, y },
                    direction,
                    peerId: movingUser.peerId,
                    name: movingUser.name,
                    isGuest: movingUser.isGuest,
                  },
                },
                movingUser.userId
              );
            }
            break;

          case "chat":
            const chattingUser = userManager.findUserByWebSocket(ws);

            if (chattingUser) {
              if (!message.payload || !message.payload.message) {
                console.warn("Invalid chat message");
                return;
              }

              const chatMessage: ChatMessage = {
                type: "chat",
                payload: {
                  userId: chattingUser.userId,
                  message: message.payload.message,
                  timestamp: Date.now(),
                  username: chattingUser.name,
                },
              };

              userManager.broadcastChatMessage(
                chattingUser.spaceId,
                chatMessage
              );
            }
            break;

          // You can add a new message type to handle space updates if needed
          case "space-update":
            const updatingUser = userManager.findUserByWebSocket(ws);
            if (updatingUser && updatingUser.spaceId) {
              // Invalidate the cache for this space to force a refresh
              spaceCache.invalidateCache(updatingUser.spaceId);
            }
            break;
        }
      } catch (error) {
        console.error("WebSocket error:", error);
        ws.close();
      }
    });

    ws.on("error", () => {
      const user = userManager.findUserByWebSocket(ws);
      if (user) {
        userManager.removeUser(user.id);
      }
    });

    ws.on("close", () => {
      const user = userManager.findUserByWebSocket(ws);
      if (user) {
        // Broadcast user left to others
        userManager.broadcastToSpace(user.spaceId, {
          type: "user-left",
          payload: {
            userId: user.userId,
            isGuest: user.isGuest,
          },
        });

        userManager.removeUser(user.id);
      }
    });
  });
}

function calculateSpawnPosition(
  spaceId: string,
  space: any
): { x: number; y: number } {
  if (!space) {
    console.error(`No space found for spaceId: ${spaceId}`);
    return { x: 0, y: 0 };
  }

  const width = space.width;
  const height = space.height;

  if (!width || !height || width <= 0 || height <= 0) {
    console.error(`Invalid space dimensions: width=${width}, height=${height}`);
    return { x: 0, y: 0 };
  }

  const usersInSpace = userManager.getUsersInSpace(spaceId);
  const occupiedPositions = new Set(
    usersInSpace.map((u) => `${u.position.x},${u.position.y}`)
  );

  const staticElements = space.elements
    .filter((el: any) => el.element.static)
    .map((el: any) => `${el.x},${el.y}`);

  staticElements.forEach((pos: string) => occupiedPositions.add(pos));

  let x, y;
  let attempts = 0;
  const maxAttempts = width * height;

  do {
    x = Math.floor(Math.random() * width);
    y = Math.floor(Math.random() * height);

    attempts++;

    if (attempts > maxAttempts) {
      console.warn(
        `Could not find unoccupied position after ${maxAttempts} attempts`
      );
      return { x: 0, y: 0 };
    }
  } while (occupiedPositions.has(`${x},${y}`));

  return { x, y };
}

export { setupWebSocketServer };
