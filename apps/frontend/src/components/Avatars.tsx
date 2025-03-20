import { useEffect, useState } from "react";

interface AvatarSprite {
  imageUrl: string;
  width: number;
  height: number;
  spriteColumns: number;
  spriteRows: number;
  animationFrames: number;
}

// Avatar Direction Enum
enum AvatarDirection {
  Front = "front",
  Back = "back",
  Left = "left",
  Right = "right",
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
export const AnimatedAvatar: React.FC<{
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
  const getSpritePosition = (): React.CSSProperties => {
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
export const AnimatedAvatar2: React.FC<{
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
  const getSpritePosition = (): React.CSSProperties => {
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
