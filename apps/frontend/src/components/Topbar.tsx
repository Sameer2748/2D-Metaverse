import React from "react";
import { MediaState } from "../libs/types";

interface TopBarProps {
  hoveredName: boolean;
  spaceDetails: any;
  setHoveredName: () => void;
  spaceDetailss: any;
  inMeetingRoom: boolean;
  showOtheruser: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  localMediaState: MediaState;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  remoteMediaState: MediaState;
}

const Topbar = ({
  hoveredName,
  spaceDetails,
  setHoveredName,
  spaceDetailss,
  inMeetingRoom,
  showOtheruser,
  localVideoRef,
  localMediaState,
  remoteVideoRef,
  remoteMediaState,
}: TopBarProps) => {
  return (
    <div className="flex justify-between  w-full ">
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
      <div className="videodiv flex justfy-between items-center gap-4">
        {!inMeetingRoom && (
          <div
            className={`w-full flex gap-4 ${!showOtheruser && "justify-center"}`}
          >
            {/* Remote video */}
            <div
              className="relative w-1/2 max-w-[200px]"
              style={{ display: showOtheruser ? "block" : "none" }}
            >
              {localVideoRef && (
                <video
                  className="rounded-xl w-full h-full object-cover"
                  ref={localVideoRef}
                  autoPlay
                  muted
                />
              )}
              {!localMediaState.video && (
                <div className="absolute inset-0 bg-blue-500 bg-opacity-80 flex items-center justify-center rounded-xl">
                  <span className="text-white font-medium">Camera Off</span>
                </div>
              )}
              {!localMediaState.audio && (
                <div className="absolute bottom-2 right-2 bg-red-500 p-1 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                      clipRule="evenodd"
                    />
                    <path d="M3 3l14 14" stroke="white" strokeWidth="2" />
                  </svg>
                </div>
              )}
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-xs">
                You
              </div>
            </div>
            {showOtheruser && (
              <>
                {/* Local video */}
                <div className="relative w-1/2 max-w-[200px]">
                  <video
                    className="rounded-xl w-full h-full object-cover"
                    ref={remoteVideoRef}
                    autoPlay
                  />
                  {!remoteMediaState.video && (
                    <div className="absolute inset-0 bg-blue-500 bg-opacity-80 flex items-center justify-center rounded-xl">
                      <span className="text-white font-medium">Camera Off</span>
                    </div>
                  )}
                  {!remoteMediaState.audio && (
                    <div className="absolute bottom-2 right-2 bg-red-500 p-1 rounded-full">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-white"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                          clipRule="evenodd"
                        />
                        <path d="M3 3l14 14" stroke="white" strokeWidth="2" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-xs">
                    Remote
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Topbar;
