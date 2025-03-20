export enum AvatarDirection {
  Front = "front",
  Back = "back",
  Left = "left",
  Right = "right",
}

export interface DataConnection {
  open: boolean;
  send: (data: { type: string }) => void;
  close: () => void;
}
export interface ChatMessage {
  userId: string;
  message: string;
  sender: string;
  timestamp: number;
  username: string;
}

export interface MeetingRoomChatmessage {
  userId: string;
  message: string;
  sender: string;
  spaceId: string;
  timestamp: number;
}

export interface UserPositionInfo {
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

export interface MediaState {
  audio: boolean;
  video: boolean;
}

export interface SpaceDetails {
  name?: string;
  dimensions: string;
  elements: SpaceElement[];
}

export interface SpaceElement {
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
}
