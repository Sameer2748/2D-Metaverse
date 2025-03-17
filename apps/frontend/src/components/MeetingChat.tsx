import React, { useRef, useEffect } from "react";
import { Send } from "lucide-react";

// Updated interface to match the ChatMessage used in Space.tsx and MeetingRoom.tsx
interface ChatMessage {
  userId?: string;
  message: string;
  sender: string;
  isCurrentUser: boolean;
  timestamp?: number;
  username?: string;
}

interface MeetingChatProps {
  messages: ChatMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  currentUserId: string;
  sendMessage?: (message: string) => void; // Add WebSocket sendMessage function
  spaceId: string; // Space ID for WebSocket connection
}

const MeetingChat: React.FC<MeetingChatProps> = ({
  messages,
  inputValue,
  onInputChange,
  onSubmit,
  currentUserId,
  sendMessage, // WebSocket send function
  spaceId, // Space ID for WebSocket connection
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle form submission with WebSocket
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    // Send message via WebSocket if sendMessage is provided
    if (sendMessage) {
      sendMessage(
        JSON.stringify({
          type: "meeting-room-chat",
          payload: {
            message: inputValue,
            sender: currentUserId, // This would typically be the user's name
            senderId: currentUserId,
            timestamp: Date.now(),
            spaceId: spaceId,
          },
        })
      );
    }

    // Call the original onSubmit to handle local state updates
    onSubmit(e);
  };

  return (
    <div className="w-80 bg-meeting-chat backdrop-blur-md border-l border-white/10 flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <h3 className="font-semibold text-white text-center">
          Meeting Room Chat
        </h3>
      </div>

      <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex w-full mb-3 ${
              msg.isCurrentUser ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 break-words ${
                msg.isCurrentUser
                  ? "bg-meeting-accent text-white rounded-br-none"
                  : "bg-meeting-card text-white rounded-bl-none"
              }`}
            >
              {!msg.isCurrentUser && (
                <div className="text-xs font-medium text-gray-300 mb-1">
                  {msg.sender}
                </div>
              )}
              <div>{msg.message}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit} // Use our new handler
        className="p-3 border-t border-white/10 bg-meeting-card/50"
      >
        <div className="flex items-center rounded-full bg-meeting-card border border-white/10 pr-2 overflow-hidden">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            className="flex-1 bg-transparent text-white px-4 py-2 focus:outline-none"
            placeholder="Type a message..."
          />
          <button
            type="submit"
            className="text-meeting-accent hover:bg-meeting-card p-2 rounded-full transition-colors duration-200"
            disabled={!inputValue.trim()}
          >
            <Send
              size={18}
              className={!inputValue.trim() ? "opacity-50" : ""}
            />
          </button>
        </div>
      </form>
    </div>
  );
};

export default MeetingChat;
