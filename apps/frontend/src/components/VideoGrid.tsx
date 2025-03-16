import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Updated interface to match MeetingRoomUser in MeetingRoom.tsx
interface User {
  userId: string; // This will now be required since we provide a fallback in MeetingRoom
  name?: string;
  username?: string;
  x?: number;
  y?: number;
  direction?: string;
  peerId?: string;
  Avatar?: string;
  inMeetingRoom?: boolean;
  stream?: MediaStream;
}

interface VideoGridProps {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  users: Record<string, User>;
  currentUserId: string;
  itemsPerPage?: number;
}

const VideoGrid: React.FC<VideoGridProps> = ({
  localVideoRef,
  users,
  currentUserId,
  itemsPerPage = 9,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [animating, setAnimating] = useState(false);
  const videoRefs = React.useRef<Record<string, HTMLVideoElement | null>>({});

  // Calculate pagination

  console.log(localVideoRef);
  const allUsers = [
    { userId: currentUserId, name: "You", username: "You" },
    ...Object.values(users).filter((user) => user.userId !== currentUserId),
  ];
  const totalPages = Math.ceil(allUsers.length / itemsPerPage);
  const paginatedUsers = allUsers.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  // Effect to attach streams to video elements
  useEffect(() => {
    paginatedUsers.forEach((user) => {
      if (user.userId !== currentUserId && user.stream) {
        const videoElement = videoRefs.current[user.userId];
        if (videoElement && videoElement.srcObject !== user.stream) {
          videoElement.srcObject = user.stream;
        }
      }
    });
  }, [paginatedUsers, currentUserId]);

  const handleNextPage = () => {
    if (currentPage < totalPages - 1 && !animating) {
      setAnimating(true);
      setCurrentPage((page) => page + 1);
      setTimeout(() => setAnimating(false), 300);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0 && !animating) {
      setAnimating(true);
      setCurrentPage((page) => page - 1);
      setTimeout(() => setAnimating(false), 300);
    }
  };

  const getGridColumns = (count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 9) return "grid-cols-3";
    return "grid-cols-3";
  };

  // Calculate grid layout dynamically based on the number of users
  const gridColumns = getGridColumns(paginatedUsers.length);

  // Helper function to get a safe name display
  const getUserDisplayName = (user: User) => {
    return user.name || user.username || `User-${user.userId.substring(0, 5)}`;
  };

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        className={`grid ${gridColumns} gap-4 h-full p-4 transition-all duration-300`}
      >
        {paginatedUsers.map((user) => (
          <div
            key={user.userId}
            className="video-container group animate-scale-in"
          >
            {user.userId === currentUserId ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={(el) => {
                  videoRefs.current[user.userId] = el;
                }}
                id={`meeting-video-${user.userId}`}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            <div className="video-name-badge group-hover:bg-meeting-accent/30 transition-all duration-200">
              {getUserDisplayName(user)}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination controls for when there are more than itemsPerPage users */}
      {totalPages > 1 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0 || animating}
            className={`pagination-button ${
              currentPage === 0
                ? "opacity-50 cursor-not-allowed"
                : "hover:scale-105"
            }`}
          >
            <ChevronLeft size={18} /> Prev
          </button>
          <div className="px-3 py-1 bg-meeting-card/80 backdrop-blur-md text-white rounded-full border border-white/10">
            {currentPage + 1} / {totalPages}
          </div>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages - 1 || animating}
            className={`pagination-button ${
              currentPage >= totalPages - 1
                ? "opacity-50 cursor-not-allowed"
                : "hover:scale-105"
            }`}
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoGrid;
