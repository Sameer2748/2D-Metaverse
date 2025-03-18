import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";

interface MediaStream {
  id: string;
  userId: string;
  name: string;
  type: "audio" | "video" | "both";
  roomType: "space" | "meeting";
  spaceId: string;
}

interface Room {
  id: string;
  participants: Map<string, Participant>;
  streams: Map<string, MediaStream>;
  type: "space" | "meeting";
}

interface Participant {
  userId: string;
  name: string;
  spaceId: string;
  ws: WebSocket;
  streams: string[]; // IDs of streams this participant is publishing
  consuming: string[]; // IDs of streams this participant is consuming
  inMeetingRoom: boolean;
}

class SFUServer {
  private wss: WebSocketServer;
  private rooms: Map<string, Room> = new Map();
  private participants: Map<string, Participant> = new Map();
  private meetingRooms: Map<string, Room> = new Map(); // Separate map for meeting rooms

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.setupEvents();
    console.log(`SFU Server running on port ${port}`);
  }

  private setupEvents() {
    this.wss.on("connection", (ws: WebSocket) => {
      let participantId = "";

      ws.on("message", (data: string) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(ws, message, participantId);
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      });

      ws.on("close", () => {
        this.handleParticipantDisconnect(participantId);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        this.handleParticipantDisconnect(participantId);
      });
    });
  }

  private handleMessage(ws: WebSocket, message: any, participantId: string) {
    const { type, payload } = message;

    switch (type) {
      case "join-sfu":
        participantId = this.handleJoinSFU(ws, payload);
        break;
      case "join-meeting-room":
        this.handleJoinMeetingRoom(participantId, payload);
        break;
      case "leave-meeting-room":
        this.handleLeaveMeetingRoom(participantId);
        break;
      case "publish-stream":
        this.handlePublishStream(participantId, payload);
        break;
      case "unpublish-stream":
        this.handleUnpublishStream(participantId, payload);
        break;
      case "subscribe-stream":
        this.handleSubscribeStream(participantId, payload);
        break;
      case "unsubscribe-stream":
        this.handleUnsubscribeStream(participantId, payload);
        break;
      case "ice-candidate":
        this.handleIceCandidate(participantId, payload);
        break;
      case "sdp-offer":
        this.handleSdpOffer(participantId, payload);
        break;
      case "sdp-answer":
        this.handleSdpAnswer(participantId, payload);
        break;
      case "leave-sfu":
        this.handleLeaveSFU(participantId);
        break;
      default:
        console.warn("Unknown message type:", type);
    }
  }

  private handleJoinSFU(ws: WebSocket, payload: any): string {
    const { userId, name, spaceId } = payload;
    const participantId = uuidv4();

    // Create or get the room for this space
    if (!this.rooms.has(spaceId)) {
      this.rooms.set(spaceId, {
        id: spaceId,
        participants: new Map(),
        streams: new Map(),
        type: "space",
      });
    }
    const room = this.rooms.get(spaceId)!;

    // Create the participant
    const participant: Participant = {
      userId,
      name,
      spaceId,
      ws,
      streams: [],
      consuming: [],
      inMeetingRoom: false,
    };

    // Add to maps
    this.participants.set(participantId, participant);
    room.participants.set(participantId, participant);

    // Send room info to the new participant
    this.sendRoomInfo(participantId);

    // Notify other participants
    this.notifyParticipantJoined(spaceId, participantId);

    // Send join confirmation
    ws.send(
      JSON.stringify({
        type: "sfu-joined",
        payload: {
          participantId,
          roomId: spaceId,
        },
      })
    );

    return participantId;
  }

  private handleJoinMeetingRoom(participantId: string, payload: any) {
    const participant = this.participants.get(participantId);
    if (!participant) return;

    const { spaceId } = payload;
    const meetingRoomId = `meeting-${spaceId}`;

    // Update participant state
    participant.inMeetingRoom = true;

    // Create or get the meeting room
    if (!this.meetingRooms.has(meetingRoomId)) {
      this.meetingRooms.set(meetingRoomId, {
        id: meetingRoomId,
        participants: new Map(),
        streams: new Map(),
        type: "meeting",
      });
    }
    const meetingRoom = this.meetingRooms.get(meetingRoomId)!;

    // Add participant to meeting room
    meetingRoom.participants.set(participantId, participant);

    // Send meeting room info to the new participant
    this.sendMeetingRoomInfo(participantId, meetingRoomId);

    // Notify other participants in meeting room
    this.notifyMeetingRoomParticipantJoined(meetingRoomId, participantId);

    // Send join confirmation
    participant.ws.send(
      JSON.stringify({
        type: "meeting-room-joined",
        payload: {
          meetingRoomId,
          participantId,
        },
      })
    );
  }

  private handleLeaveMeetingRoom(participantId: string) {
    const participant = this.participants.get(participantId);
    if (!participant) return;

    const meetingRoomId = `meeting-${participant.spaceId}`;
    const meetingRoom = this.meetingRooms.get(meetingRoomId);
    if (!meetingRoom) return;

    // Update participant state
    participant.inMeetingRoom = false;

    // Remove participant's streams from meeting room
    for (const streamId of participant.streams) {
      const stream = meetingRoom.streams.get(streamId);
      if (stream && stream.roomType === "meeting") {
        this.handleUnpublishStream(participantId, { streamId });
      }
    }

    // Remove participant from meeting room
    meetingRoom.participants.delete(participantId);

    // Notify other participants
    this.notifyMeetingRoomParticipantLeft(meetingRoomId, participant.userId);

    // Clean up empty meeting room
    if (meetingRoom.participants.size === 0) {
      this.meetingRooms.delete(meetingRoomId);
    }

    // Send leave confirmation
    participant.ws.send(
      JSON.stringify({
        type: "meeting-room-left",
        payload: {
          meetingRoomId,
        },
      })
    );
  }

  private sendMeetingRoomInfo(participantId: string, meetingRoomId: string) {
    const participant = this.participants.get(participantId);
    if (!participant) return;

    const meetingRoom = this.meetingRooms.get(meetingRoomId);
    if (!meetingRoom) return;

    // Collect all streams in the meeting room
    const streams = Array.from(meetingRoom.streams.values()).map((stream) => ({
      id: stream.id,
      userId: stream.userId,
      name: stream.name,
      type: stream.type,
    }));

    // Collect all participants in the meeting room
    const participants = Array.from(meetingRoom.participants.values()).map(
      (p) => ({
        userId: p.userId,
        name: p.name,
      })
    );

    // Send meeting room info to the participant
    participant.ws.send(
      JSON.stringify({
        type: "meeting-room-info",
        payload: {
          streams,
          participants,
          meetingRoomId,
        },
      })
    );
  }

  private notifyMeetingRoomParticipantJoined(
    meetingRoomId: string,
    newParticipantId: string
  ) {
    const meetingRoom = this.meetingRooms.get(meetingRoomId);
    if (!meetingRoom) return;

    const newParticipant = meetingRoom.participants.get(newParticipantId);
    if (!newParticipant) return;

    // Notify all other participants about the new participant
    for (const [id, participant] of meetingRoom.participants.entries()) {
      if (id !== newParticipantId) {
        participant.ws.send(
          JSON.stringify({
            type: "meeting-room-participant-joined",
            payload: {
              userId: newParticipant.userId,
              name: newParticipant.name,
              meetingRoomId,
            },
          })
        );
      }
    }
  }

  private notifyMeetingRoomParticipantLeft(
    meetingRoomId: string,
    userId: string
  ) {
    const meetingRoom = this.meetingRooms.get(meetingRoomId);
    if (!meetingRoom) return;

    // Notify all participants about the leaving participant
    for (const participant of meetingRoom.participants.values()) {
      participant.ws.send(
        JSON.stringify({
          type: "meeting-room-participant-left",
          payload: {
            userId,
            meetingRoomId,
          },
        })
      );
    }
  }

  private sendRoomInfo(participantId: string) {
    const participant = this.participants.get(participantId);
    if (!participant) return;

    const room = this.rooms.get(participant.spaceId);
    if (!room) return;

    // Collect all streams in the room
    const streams = Array.from(room.streams.values()).map((stream) => ({
      id: stream.id,
      userId: stream.userId,
      name: stream.name,
      type: stream.type,
    }));

    // Collect all participants in the room
    const participants = Array.from(room.participants.values()).map((p) => ({
      userId: p.userId,
      name: p.name,
    }));

    // Send room info to the participant
    participant.ws.send(
      JSON.stringify({
        type: "room-info",
        payload: {
          streams,
          participants,
        },
      })
    );
  }

  private notifyParticipantJoined(roomId: string, newParticipantId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const newParticipant = room.participants.get(newParticipantId);
    if (!newParticipant) return;

    // Notify all other participants about the new participant
    for (const [id, participant] of room.participants.entries()) {
      if (id !== newParticipantId) {
        participant.ws.send(
          JSON.stringify({
            type: "participant-joined",
            payload: {
              userId: newParticipant.userId,
              name: newParticipant.name,
            },
          })
        );
      }
    }
  }

  private handlePublishStream(participantId: string, payload: any) {
    const { streamId, streamType, sdpOffer } = payload;
    const participant = this.participants.get(participantId);
    if (!participant) return;

    const room = this.rooms.get(participant.spaceId);
    if (!room) return;

    // Determine if this is for a meeting room or normal space
    const roomType = participant.inMeetingRoom ? "meeting" : "space";
    const targetRoomId =
      roomType === "meeting"
        ? `meeting-${participant.spaceId}`
        : participant.spaceId;
    const targetRoom =
      roomType === "meeting" ? this.meetingRooms.get(targetRoomId) : room;

    if (!targetRoom) return;

    // Create the stream
    const stream: MediaStream = {
      id: streamId,
      userId: participant.userId,
      name: participant.name,
      type: streamType,
      roomType: roomType,
      spaceId: participant.spaceId,
    };

    // Add stream to maps
    targetRoom.streams.set(streamId, stream);
    participant.streams.push(streamId);

    // Notify all participants in the room about the new stream
    for (const [id, p] of targetRoom.participants.entries()) {
      p.ws.send(
        JSON.stringify({
          type:
            roomType === "meeting" ? "meeting-stream-added" : "stream-added",
          payload: {
            stream: {
              id: stream.id,
              userId: stream.userId,
              name: stream.name,
              type: stream.type,
            },
            roomType: roomType,
          },
        })
      );
    }

    // Send acknowledgment to the publisher
    participant.ws.send(
      JSON.stringify({
        type: "stream-published",
        payload: {
          streamId,
          roomType,
        },
      })
    );
  }

  private handleUnpublishStream(participantId: string, payload: any) {
    const { streamId } = payload;
    const participant = this.participants.get(participantId);
    if (!participant) return;

    const room = this.rooms.get(participant.spaceId);
    if (!room) return;

    // Determine if this is for a meeting room or normal space
    let roomType = "space";
    let targetRoom = room;

    // Check if the stream exists in the space room
    const stream = room.streams.get(streamId);

    // If not found in space room, check meeting room
    if (!stream) {
      const meetingRoomId = `meeting-${participant.spaceId}`;
      const meetingRoom = this.meetingRooms.get(meetingRoomId);
      if (meetingRoom) {
        const meetingStream = meetingRoom.streams.get(streamId);
        if (meetingStream) {
          roomType = "meeting";
          targetRoom = meetingRoom;
        }
      }
    }

    // Remove stream from maps
    targetRoom.streams.delete(streamId);
    participant.streams = participant.streams.filter((id) => id !== streamId);

    // Notify all participants in the room about the removed stream
    for (const [id, p] of targetRoom.participants.entries()) {
      p.ws.send(
        JSON.stringify({
          type:
            roomType === "meeting"
              ? "meeting-stream-removed"
              : "stream-removed",
          payload: {
            streamId,
            roomType,
          },
        })
      );

      // Remove from consuming list if they were consuming this stream
      p.consuming = p.consuming.filter((id) => id !== streamId);
    }

    // Send acknowledgment to the publisher
    participant.ws.send(
      JSON.stringify({
        type: "stream-unpublished",
        payload: {
          streamId,
          roomType,
        },
      })
    );
  }

  private handleSubscribeStream(participantId: string, payload: any) {
    const { streamId, roomType = "space" } = payload;
    const participant = this.participants.get(participantId);
    if (!participant) return;

    const targetRoomId =
      roomType === "meeting"
        ? `meeting-${participant.spaceId}`
        : participant.spaceId;
    const targetRoom =
      roomType === "meeting"
        ? this.meetingRooms.get(targetRoomId)
        : this.rooms.get(participant.spaceId);

    if (!targetRoom) return;

    const stream = targetRoom.streams.get(streamId);
    if (!stream) return;

    // Add to consuming list
    if (!participant.consuming.includes(streamId)) {
      participant.consuming.push(streamId);
    }

    // Find the publisher of this stream
    const publisher = Array.from(targetRoom.participants.values()).find((p) =>
      p.streams.includes(streamId)
    );

    if (publisher) {
      // Notify the publisher about the new subscriber
      publisher.ws.send(
        JSON.stringify({
          type: "new-subscriber",
          payload: {
            streamId,
            subscriberId: participant.userId,
            subscriberName: participant.name,
            roomType,
          },
        })
      );
    }

    participant.ws.send(
      JSON.stringify({
        type: "stream-subscribed",
        payload: {
          streamId,
          publisherId: stream.userId,
          publisherName: stream.name,
          roomType,
        },
      })
    );
  }

  private handleUnsubscribeStream(participantId: string, payload: any) {
    const { streamId, roomType = "space" } = payload;
    const participant = this.participants.get(participantId);
    if (!participant) return;

    // Remove from consuming list
    participant.consuming = participant.consuming.filter(
      (id) => id !== streamId
    );

    // Notify the publisher
    const targetRoomId =
      roomType === "meeting"
        ? `meeting-${participant.spaceId}`
        : participant.spaceId;
    const targetRoom =
      roomType === "meeting"
        ? this.meetingRooms.get(targetRoomId)
        : this.rooms.get(participant.spaceId);

    if (targetRoom) {
      const stream = targetRoom.streams.get(streamId);
      if (stream) {
        const publisher = Array.from(targetRoom.participants.values()).find(
          (p) => p.userId === stream.userId
        );

        if (publisher) {
          publisher.ws.send(
            JSON.stringify({
              type: "subscriber-left",
              payload: {
                streamId,
                subscriberId: participant.userId,
                roomType,
              },
            })
          );
        }
      }
    }

    // Send acknowledgment
    participant.ws.send(
      JSON.stringify({
        type: "stream-unsubscribed",
        payload: {
          streamId,
          roomType,
        },
      })
    );
  }

  private handleIceCandidate(participantId: string, payload: any) {
    const { streamId, candidate, target, roomType = "space" } = payload;
    const participant = this.participants.get(participantId);
    if (!participant) return;

    const targetRoomId =
      roomType === "meeting"
        ? `meeting-${participant.spaceId}`
        : participant.spaceId;
    const targetRoom =
      roomType === "meeting"
        ? this.meetingRooms.get(targetRoomId)
        : this.rooms.get(participant.spaceId);

    if (!targetRoom) return;

    // For the target participant (if subscribing)
    if (target) {
      const targetParticipant = Array.from(
        targetRoom.participants.values()
      ).find((p) => p.userId === target);

      if (targetParticipant) {
        targetParticipant.ws.send(
          JSON.stringify({
            type: "ice-candidate",
            payload: {
              streamId,
              candidate,
              from: participant.userId,
              roomType,
            },
          })
        );
      }
    }
  }

  private handleSdpOffer(participantId: string, payload: any) {
    const { streamId, sdpOffer, target, roomType = "space" } = payload;
    const participant = this.participants.get(participantId);
    if (!participant) return;

    const targetRoomId =
      roomType === "meeting"
        ? `meeting-${participant.spaceId}`
        : participant.spaceId;
    const targetRoom =
      roomType === "meeting"
        ? this.meetingRooms.get(targetRoomId)
        : this.rooms.get(participant.spaceId);

    if (!targetRoom) return;

    // Find the target participant (the publisher of the stream)
    if (target) {
      const targetParticipant = Array.from(
        targetRoom.participants.values()
      ).find((p) => p.userId === target);

      if (targetParticipant) {
        targetParticipant.ws.send(
          JSON.stringify({
            type: "sdp-offer",
            payload: {
              streamId,
              sdpOffer,
              from: participant.userId,
              roomType,
            },
          })
        );
      }
    }
  }

  private handleSdpAnswer(participantId: string, payload: any) {
    const { streamId, sdpAnswer, target, roomType = "space" } = payload;
    const participant = this.participants.get(participantId);
    if (!participant) return;

    const targetRoomId =
      roomType === "meeting"
        ? `meeting-${participant.spaceId}`
        : participant.spaceId;
    const targetRoom =
      roomType === "meeting"
        ? this.meetingRooms.get(targetRoomId)
        : this.rooms.get(participant.spaceId);

    if (!targetRoom) return;

    // Find the target participant (the subscriber)
    if (target) {
      const targetParticipant = Array.from(
        targetRoom.participants.values()
      ).find((p) => p.userId === target);

      if (targetParticipant) {
        targetParticipant.ws.send(
          JSON.stringify({
            type: "sdp-answer",
            payload: {
              streamId,
              sdpAnswer,
              from: participant.userId,
              roomType,
            },
          })
        );
      }
    }
  }

  private handleLeaveSFU(participantId: string) {
    this.handleParticipantDisconnect(participantId);
  }

  private handleParticipantDisconnect(participantId: string) {
    if (!participantId) return;

    const participant = this.participants.get(participantId);
    if (!participant) return;

    const room = this.rooms.get(participant.spaceId);
    if (!room) return;

    // If in meeting room, leave it first
    if (participant.inMeetingRoom) {
      this.handleLeaveMeetingRoom(participantId);
    }

    // Clean up participant's streams
    for (const streamId of participant.streams) {
      room.streams.delete(streamId);

      // Notify others about removed streams
      for (const [id, p] of room.participants.entries()) {
        if (id !== participantId) {
          p.ws.send(
            JSON.stringify({
              type: "stream-removed",
              payload: {
                streamId,
              },
            })
          );
        }
      }
    }

    // Remove participant from room
    room.participants.delete(participantId);

    // Remove participant from global map
    this.participants.delete(participantId);

    // Notify others about participant leaving
    for (const p of room.participants.values()) {
      p.ws.send(
        JSON.stringify({
          type: "participant-left",
          payload: {
            userId: participant.userId,
          },
        })
      );
    }

    // Clean up empty rooms
    if (room.participants.size === 0) {
      this.rooms.delete(participant.spaceId);
    }
  }
}

// Create and start the SFU server
const SFU_PORT = process.env.SFU_PORT ? parseInt(process.env.SFU_PORT) : 3002;
const sfuServer = new SFUServer(SFU_PORT);

export default sfuServer;
