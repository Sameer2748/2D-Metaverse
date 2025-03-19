"use client";
import { BsChatLeftText } from "react-icons/bs";
import { FaSignOutAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { MediaState } from "../libs/types";

interface Bottomprops {
  user: object;
  toggleLocalAudio: () => void;
  localMediaState: MediaState;
  toggleLocalVideo: () => void;
  handleshowChat: () => void;
}
const Bottom = ({
  user,
  toggleLocalAudio,
  localMediaState,
  toggleLocalVideo,
  handleshowChat,
}: Bottomprops) => {
  const navigate = useNavigate();
  return (
    <div
      className="w-screen  flex justify-between items-center h-[55px] pl-4 pr-4"
      style={{ backgroundColor: "rgb(27 32 66)" }}
    >
      <div className="flex justify-center items-center gap-2">
        {/* // homme image gather go to home */}
        <div
          className="w-[40px] h-[40px] bg-black rounded-xl flex items-center justify-center  cursor-pointer  ml-4 mr-2"
          style={{ backgroundColor: "rgb(27 32 66)" }}
        >
          <svg
            className="w-[30px] h-[30px]"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M5.022 1.07a.698.698 0 01.273-.974.762.762 0 011.016.26l1.58 2.625c.02.003.041.008.062.013l3.636.934a.711.711 0 01.526.874c-.107.38-.514.607-.911.505L7.92 4.463l-.879 3.145c-.106.381-.514.607-.911.505a.71.71 0 01-.526-.874l.974-3.486a.726.726 0 01.02-.063L5.023 1.07zm7.707 11.385c1.434-.793 1.925-2.552 1.097-3.927-.828-1.375-2.662-1.846-4.095-1.052-1.434.794-1.926 2.552-1.098 3.927.828 1.375 2.662 1.846 4.096 1.052zm-.775-1.26c.709-.393.952-1.262.542-1.943-.41-.68-1.316-.913-2.026-.52-.71.392-.952 1.262-.543 1.943.41.68 1.317.913 2.027.52zm-4.359.795c.828 1.376.337 3.134-1.097 3.928-1.434.793-3.268.322-4.096-1.053-.828-1.375-.337-3.133 1.097-3.927s3.268-.323 4.096 1.052zm-1.341.7c.41.68.166 1.55-.543 1.943-.71.393-1.617.16-2.027-.521-.41-.68-.166-1.55.543-1.943.71-.393 1.617-.16 2.027.52zm6.993 7.088c1.434-.794 1.925-2.552 1.097-3.927-.828-1.376-2.662-1.847-4.096-1.053-1.434.794-1.925 2.552-1.097 3.927.828 1.375 2.662 1.846 4.096 1.053zm-.799-1.293c.71-.393.952-1.263.543-1.943-.41-.68-1.317-.913-2.026-.52-.71.392-.953 1.262-.543 1.942.41.68 1.317.914 2.026.521zm8.148 1.202c.828 1.375.337 3.134-1.097 3.927-1.434.794-3.268.323-4.096-1.052-.828-1.375-.337-3.133 1.097-3.927s3.268-.323 4.096 1.052zm-1.331.715c.41.68.166 1.55-.543 1.943-.71.393-1.617.16-2.027-.52-.41-.68-.166-1.55.543-1.943.71-.393 1.617-.16 2.027.52zm.236-4.087c1.434-.793 1.925-2.552 1.097-3.927-.828-1.375-2.662-1.846-4.096-1.052-1.434.794-1.925 2.552-1.097 3.927.828 1.375 2.662 1.846 4.096 1.053zm-.748-1.267c.71-.393.952-1.263.543-1.943-.41-.68-1.317-.914-2.027-.521-.71.393-.952 1.263-.542 1.943.41.68 1.316.913 2.026.52zm1.327-9.982c.828 1.375.337 3.133-1.097 3.927s-3.268.323-4.096-1.052c-.828-1.375-.336-3.134 1.098-3.927 1.434-.794 3.267-.323 4.095 1.052zm-1.34.69c.409.68.166 1.55-.544 1.943-.709.392-1.616.16-2.026-.521-.41-.68-.167-1.55.543-1.943.71-.393 1.617-.16 2.026.52z"
              fill="currentColor"
            ></path>
          </svg>
        </div>
        <div
          className="flex w-auto h-[45px] flex items-center justify-between  pr-2 rounded-xl m-1 cursor-pointer"
          style={{ backgroundColor: "rgb(117 126 197)" }}
        >
          <div className="rounded-xl w-[50px] flex items-center justify-center ">
            <img
              style={{ borderRadius: "10px" }}
              width={40}
              height={30}
              src="data:image/jpeg;base64,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"
              alt=""
            />
          </div>
          {/* {isAvailable ? (
                  <div className=" w-[60px] flex items-center justify-center ">
                    <video
                      className="rounded-xl"
                      ref={videoref}
                      autoPlay
                      muted
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl w-[50px] flex items-center justify-center ">
                    <img
                      style={{ borderRadius: "10px" }}
                      width={40}
                      height={30}
                      src="data:image/jpeg;base64,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"
                      alt=""
                    />
                  </div>
                )} */}
          <div className="bg-black w-[1px] h-[45px]" />
          <div className="pl-2">
            <p className="text-sm">{user.name}</p>
            <p className="text-sm">{user.username}</p>
          </div>
        </div>
      </div>
      {/* video containers */}
      <div className="mt-4 flex gap-4 justify-center">
        <button
          onClick={toggleLocalAudio}
          className={`p-2 rounded-full ${localMediaState.audio ? "bg-gray-200" : "bg-red-500"}`}
        >
          {localMediaState.audio ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.586 15H4a1 1 0 01-1-1V8a1 1 0 011-1h1.586l4.707-4.707C10.923 1.663 12 2.109 12 3v18c0 .891-1.077 1.337-1.707.707L5.586 17H4a1 1 0 01-1-1v-1z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
              />
            </svg>
          )}
        </button>
        <button
          onClick={toggleLocalVideo}
          className={`p-2 rounded-full ${localMediaState.video ? "bg-gray-200" : "bg-red-500"}`}
        >
          {localMediaState.video ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
              />
            </svg>
          )}
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleshowChat}
          className="mr-10 flex gap-2 justify-center items-center"
        >
          <BsChatLeftText size={25} />
        </button>
        <div className="bg-gray-400 w-[1px] h-[35px]" />
        <button onClick={() => navigate("/")}>
          <FaSignOutAlt size={20} />
        </button>
      </div>
    </div>
  );
};

export default Bottom;
