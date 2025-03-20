import { useRecoilValue } from "recoil";
import { userState } from "../store/userAtom";

interface ChatMessage {
  userId: string;
  message: string;
  timestamp: number;
}

interface chatProps {
  chatMessages: ChatMessage[];
  chatEndRef: React.LegacyRef<HTMLDivElement>;
  handleChatSubmit: () => void;
  chatInput: string;
  setChatInput: (value: string) => void;
}

const ChatBox = ({
  chatMessages,
  chatEndRef,
  chatInput,
  setChatInput,
  handleChatSubmit,
}: chatProps) => {
  const user = useRecoilValue(userState);

  return (
    <>
      <div className="w-[20%] h-[80%] bg-[#545c8f] rounded-lg flex flex-col shadow-lg border border-[#6c75b5]/30">
        {/* Header */}
        <div className="bg-[#454c77] p-2 rounded-t-lg border-b border-[#3e4469]">
          <h2 className="text-[#d8daf0] font-bold text-center">
            Metaverse Chat
          </h2>
        </div>

        {/* Messages container */}
        <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-[#4a5180]">
          {chatMessages.map((msg, index) => {
            const isCurrentUser = msg.userId === user?.id;
            return (
              <div
                key={index}
                className={`flex flex-col ${
                  isCurrentUser ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[80%] shadow-md ${
                    isCurrentUser
                      ? "bg-[#7980b7] text-white rounded-tr-none"
                      : "bg-[#3e4469] text-white rounded-tl-none"
                  }`}
                >
                  <div className="text-xs text-[#b6bae0] font-medium mb-1">
                    {isCurrentUser ? "You" : msg.userId}
                  </div>
                  <div className="break-words text-[#f0f1f9]">
                    {msg.message}
                  </div>
                </div>
                <div className="text-xs text-[#a9aed8] mt-1 mx-2">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} /> {/* Scroll anchor */}
        </div>

        {/* Input form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleChatSubmit();
          }}
          className="p-3 border-t border-[#454c77] bg-[#454c77]"
        >
          <div className="flex w-full justify-between items-center rounded-full overflow-hidden shadow-md">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-grow p-3 bg-[#3e4469] text-[#d8daf0] focus:outline-none placeholder-[#8b92c9] pl-4"
            />
            <button
              type="submit"
              className="bg-[#7980b7] text-white px-5 py-3 hover:bg-[#8b92c9] transition-colors font-medium"
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
