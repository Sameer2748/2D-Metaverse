import { AvatarDirection, UserPositionInfo } from "./types";

export const determineDirection = (
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

export const checkFacingUsers = (
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
