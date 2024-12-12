import React from "react";
import { useRecoilValue } from "recoil";
import { userState } from "../store/userAtom";

interface ChatMessage {
  userId: string;
  message: string;
  timestamp: number;
}
interface chatProps {
  chatMessages: ChatMessage[];
  chatEndRef: HTMLDivElement;
  handleChatSubmit: () => void;
  chatInput: string;
  setChatInput: () => void;
}
const ChatBox = ({
  chatMessages,
  chatEndRef,
  chatInput,
  setChatInput,
  handleChatSubmit,
}: chatProps) => {
  const user = useRecoilValue(userState);
  console.log(chatMessages);

  return (
    <>
      <div className="w-[20%] h-[80%] bg-gray-800 rounded-lg flex flex-col ">
        <div className="flex-grow overflow-y-auto p-4 space-y-2">
          {chatMessages.map((msg, index) => {
            return (
              <div
                key={index}
                className={`p-2 rounded-lg ${
                  msg.userId === user?.id
                    ? "bg-blue-600 text-white self-end"
                    : "bg-gray-700 text-white self-start"
                }`}
              >
                <div className="text-xs text-gray-300">
                  {msg.userId === user?.id ? "You" : msg.userId}
                </div>
                {msg.message}
              </div>
            );
          })}
          <div ref={chatEndRef} /> {/* Scroll anchor */}
        </div>

        <form
          onSubmit={handleChatSubmit}
          className="p-4 border-t border-gray-700"
        >
          <div className="flex w-full justify-between items-center">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-grow p-2 bg-gray-700 text-white rounded-l-lg focus:outline-none"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ChatBox;
