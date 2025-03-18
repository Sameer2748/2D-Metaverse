import { useState, useRef, useEffect, SetStateAction } from "react";
import Peer, { MediaConnection } from "peerjs";

interface MediaState {
  audio: boolean;
  video: boolean;
}

const usePeerCall = (
  peerInstance: React.MutableRefObject<Peer | null>,
  setShowOtherUser: React.Dispatch<SetStateAction<boolean>>
) => {
  const [activeCall, setActiveCall] = useState<MediaConnection | null>(null);
  const [activeConnection, setActiveConnection] = useState<any>(null);
  const [localMediaState, setLocalMediaState] = useState<MediaState>({
    audio: true,
    video: true,
  });
  const [remoteMediaState, setRemoteMediaState] = useState<MediaState>({
    audio: true,
    video: true,
  });
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const getVideoDevice = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.find((device) => device.kind === "videoinput");
  };

  const startCall = async (from: string, to: string) => {
    if (!peerInstance.current) return;

    const videoDevice = await getVideoDevice();
    if (!videoDevice) {
      alert("No video device available");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: videoDevice.deviceId
            ? { exact: videoDevice.deviceId }
            : undefined,
        },
        audio: true,
      });

      localStreamRef.current = stream;
      setShowOtherUser(true);

      const conn = peerInstance.current.connect(to);
      setActiveConnection(conn);

      conn.on("open", async () => {
        const call = peerInstance.current!.call(to, stream);
        setActiveCall(call);

        call.on("stream", (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });

        call.on("close", endCall);
        call.on("error", endCall);
      });

      conn.on("data", (data) => {
        if (data.type === "end-call") endCall();
        if (data.type === "media-state-change") {
          setRemoteMediaState({ audio: data.audio, video: data.video });
        }
      });
    } catch (error) {
      console.error("Error starting call:", error);
      endCall();
    }
  };

  const endCall = () => {
    [localStreamRef.current, remoteVideoRef.current?.srcObject].forEach(
      (stream) => {
        if (stream instanceof MediaStream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      }
    );

    activeCall?.close();
    activeConnection?.close();
    setActiveCall(null);
    setActiveConnection(null);
    setShowOtherUser(false);
    setLocalMediaState({ audio: true, video: true });
    setRemoteMediaState({ audio: true, video: true });
  };

  const toggleLocalMedia = (type: "audio" | "video") => {
    if (localStreamRef.current) {
      const track = localStreamRef.current
        .getTracks()
        .find((t) => t.kind === type);
      if (track) {
        track.enabled = !track.enabled;
        setLocalMediaState((prev) => ({ ...prev, [type]: track.enabled }));
      }
    }
  };

  return {
    startCall,
    endCall,
    toggleLocalAudio: () => toggleLocalMedia("audio"),
    toggleLocalVideo: () => toggleLocalMedia("video"),
    localMediaState,
    remoteMediaState,
    remoteVideoRef,
  };
};

export default usePeerCall;
