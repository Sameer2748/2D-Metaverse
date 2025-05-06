"use client";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { SlCalender } from "react-icons/sl";
import { BsStars } from "react-icons/bs";
import { useRecoilState } from "recoil";
import { avatarState, userState } from "../store/userAtom";
import { MdEdit } from "react-icons/md";
import Button from "./ui/Button";
import { toast } from "sonner";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ElementCreation, MapCreation, SpaceCreation } from "./CreateElement";
import { BACKEND_URL } from "../config";

const DashNav = ({setShow, show}:{setShow: Dispatch<SetStateAction<number>>, show:number}) => {
  const [user, setUser] = useRecoilState(userState);
  const [avatar, setAvatar] = useRecoilState(avatarState);
  const [hover, setHover] = useState(false);
  const [EditCh, setEditCh] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreateElement, setShowCreateElement] = useState(false);
  const navigate = useNavigate();
  const [showMapCreate, setShowMapCreate] = useState(false);
  const [createSpace, setCreateSpace] = useState(false);
  const [openJoinSpace, setOpenJoinSpace] = useState(false);
  const [allAvatars, setAvatars] = useState([]);
  const [newAvatarId, setNewAvatarId] = useState("");
  const [showAvatarSelection, setshowAvatarSelection] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const token = await localStorage.getItem("token");
      if (!token) {
        navigate("/signIn");
      }

      const avatars = await axios.get(`${BACKEND_URL}/avatars`);
      setAvatars(avatars.data.avatars);
    };
    fetch();
  }, []);

  const update = async () => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${BACKEND_URL}/user/metadata`,
        {
          name: name,
        },
        { headers: { Authorization: `${localStorage.getItem("token")}` } }
      );

      setUser(res.data.user);

      toast("updated successfully");
      setName("");
      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast("error in updating name");
    }
    setEditCh(false);
    setHover(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/signUp");
  };

  const handleUpdateAvatar = async () => {
    try {
      if (!newAvatarId) {
        toast("Please select an avatar");
        return;
      }
      const update = await axios.post(
        `${BACKEND_URL}/user/avatar`,
        {
          avatarId: newAvatarId,
        },
        {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        }
      );

      if (update) {
        setAvatar(update.data.avatar);
        toast("Avatar updated successfully");
        setNewAvatarId("");
        setshowAvatarSelection(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="fixed top-0 left-0 w-full bg-[rgb(54,58,89)] justify-between  text-white z-50 flex flex-col md:flex-row items-center p-4">
      {/* Left Navigation Section */}
      <div className="w-full md:w-[35%] flex justify-between items-center gap-2 mb-4 md:mb-0">
        <div className="ml-6">
          <p className="text-xl text-white">Gather</p>
        </div>
        <div onClick={()=> setShow(0)} className={`w-[115px] h-[40px] flex justify-center ${show === 0 && "bg-gray-200 text-black " } items-center gap-2 hover:bg-gray-200 p-1 rounded-xl hover:text-black cursor-pointer `}>
          <BsStars />
          <p>My Spaces</p>
        </div>
        <div onClick={()=> setShow(1)} className={`w-[100px] h-[40px] flex justify-center ${show === 1 && "bg-gray-200 text-black" } items-center gap-2 hover:bg-gray-200 p-1 rounded-xl hover:text-black cursor-pointer`}>
          <SlCalender />
          <p>Teams</p>
        </div>
      </div>

      {/* Right User Section */}
      <div className="w-full md:w-[55%] flex justify-center items-center gap-2 relative">
        {/* Username and Avatar Section */}
        <div
          onClick={() => setHover((prev) => !prev)}
          className="w-[70%] p-2 flex justify-center items-center gap-2 hover:bg-gray-200 rounded-xl hover:text-black cursor-pointer"
        >
          <img
            src={avatar.imageUrl}
            alt="User Avatar"
            className="rounded-full w-[30px] h-[30px] "
          />
          <p className="text-lg font-semibold">{user?.name}</p>
        </div>

        {/* Popup with options */}
        {hover && (
          <div
            className="absolute top-[120%] left-[0%] w-[190px] flex flex-col gap-2 shadow-lg p-4 rounded-xl z-10"
            style={{ backgroundColor: "rgb(84, 92, 143)" }}
          >
            <div className="flex flex-col text-white h-[50px]">
              <div className="w-full flex justify-between items-center">
                <p>{user.name}</p>
                <MdEdit
                  className="w-[25px] h-[25px] bg-[#3a3dab] p-1 rounded-xl cursor-pointer"
                  onClick={() => {
                    setEditCh((prev) => !prev);
                  }}
                />
              </div>
              <p className="">{user?.username}</p>
            </div>
            <div className="h-[2px] rounded-xl bg-white"></div>
            <h1
              className="cursor-pointer text-WHITE hover:font-semibold"
              onClick={handleLogout}
            >
              Sign Out
            </h1>
          </div>
        )}
        {EditCh && (
          <>
            {/* Backdrop */}
            <div className="fixed top-0 left-0 w-full h-full bg-black opacity-50 z-20"></div>

            {/* Centered Popup */}
            <div
              className="fixed top-1/2 left-1/2 w-[436px] h-[500px] flex flex-col gap-2 shadow-lg rounded-xl z-30"
              style={{
                backgroundColor: "rgb(84, 92, 143)",
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="h-[50%]">
                <div className="w-full h-full flex items-center justify-center">
                  <p className="absolute top-[1.5rem] left-[1.5rem] text-white text-lg w-auto h-[35px] bg-[#00000080] font-semibold p-2 rounded-xl flex justify-center items-center">
                    {user?.name}
                  </p>
                  <p
                    onClick={() => setEditCh((prev) => !prev)}
                    className="absolute top-[1.5rem] right-[1.5rem] cursor-pointer text-white text-[32px] w-auto h-[35px] font-semibold p-2 rounded-xl flex justify-center items-center"
                  >
                    x
                  </p>
                  <img
                    width={150}
                    height={150}
                    src="https://dynamic-assets.gather.town/v2/sprite-profile/avatar-gV7nljNpXAGHgAEnbBWv.3ZnyOry7q9szgHCU1URo.GOIono5TlL1mMHqoryfb.R-mO0WjmRySf-DdFAMmb.qXZsUMXd6wr2ICupUTcz.png?d=."
                    alt=""
                  />
                </div>
              </div>
              <div className="h-[50%] bg-[#202540] w-full flex justify-center items-center rounded-xl">
                <div className="w-[80%] h-[80%] flex flex-col gap-4">
                  <h1 className="text-xl font-bold">What’s your name?</h1>
                  <p className="text-sm">
                    Your name shows above your character. You’ll be able to
                    change it anytime.
                  </p>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-transparent border border-gray-500 text-white rounded-lg h-[50px] p-2 focus:outline-none focus:ring-0"
                    placeholder="Enter your New Name"
                  />
                  <div className="flex justify-center items-center">
                    <div className="flex justify-between items-center gap-4">
                      <Button
                        text="Back"
                        size="xl"
                        color="black"
                        classname="bg-[rgb(84, 92, 143)] cursor-pointer"
                        onClick={() => setEditCh(false)}
                      />
                      <Button
                        text={loading ? "Updating" : "Update"}
                        color="black"
                        size="xl"
                        classname="bg-[rgb(84, 92, 143)] cursor-pointer"
                        onClick={update}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {showCreateElement && (
          <>
            {/* Backdrop */}
            <div className="fixed top-0 left-0 w-full h-full bg-black opacity-50 z-20"></div>

            {/* Centered Popup */}
            <div
              className="fixed top-1/2 left-1/2 w-[500px] pr-10 h-auto flex flex-col gap-2 shadow-lg rounded-xl z-30"
              style={{
                backgroundColor: "rgb(84, 92, 143)",
                transform: "translate(-50%, -50%)",
              }}
            >
              <ElementCreation
                onClick={() => setShowCreateElement((prev) => !prev)}
              />
            </div>
          </>
        )}
        {showMapCreate && (
          <>
            {/* Backdrop */}
            <div className="fixed top-0 left-0 w-full h-full bg-black opacity-50 z-20"></div>

            {/* Centered Popup */}
            <div
              className="fixed top-1/2 left-1/2 w-full h-full flex flex-col gap-2 shadow-lg rounded-xl z-30"
              style={{
                backgroundColor: "rgb(84, 92, 143)",
                transform: "translate(-50%, -50%)",
              }}
            >
              <MapCreation onClick={() => setShowMapCreate((prev) => !prev)} />
            </div>
          </>
        )}
        {openJoinSpace && (
          <>
            {/* Backdrop */}
            <div className="fixed top-0 left-0 w-full h-full bg-black opacity-50 z-20"></div>

            {/* Centered Popup */}
            <div
              className="fixed top-1/2 left-1/2 w-[436px] h-[500px] flex flex-col gap-2 shadow-lg rounded-xl z-30"
              style={{
                backgroundColor: "rgb(84, 92, 143)",
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="h-[50%]">
                <div className="w-full h-full flex items-center justify-center">
                  <p className="absolute top-[1.5rem] left-[1.5rem] text-white text-lg w-auto h-[35px] bg-[#00000080] font-semibold p-2 rounded-xl flex justify-center items-center">
                    {user?.name}
                  </p>
                  <p
                    onClick={() => setOpenJoinSpace((prev) => !prev)}
                    className="absolute top-[1.5rem] right-[1.5rem] cursor-pointer text-white text-[32px] w-auto h-[35px] font-semibold p-2 rounded-xl flex justify-center items-center"
                  >
                    x
                  </p>
                  <img
                    width={150}
                    height={150}
                    src="https://dynamic-assets.gather.town/v2/sprite-profile/avatar-gV7nljNpXAGHgAEnbBWv.3ZnyOry7q9szgHCU1URo.GOIono5TlL1mMHqoryfb.R-mO0WjmRySf-DdFAMmb.qXZsUMXd6wr2ICupUTcz.png?d=."
                    alt=""
                  />
                </div>
              </div>
              <div className="h-[50%] bg-[#202540] w-full flex justify-center items-center rounded-xl">
                <div className="w-[80%] h-[80%] flex flex-col gap-4">
                  <h1 className="text-xl font-bold">Join Space Let's go..</h1>
                  <p className="text-sm">Enter Space url</p>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="bg-transparent border border-gray-500 text-white rounded-lg h-[50px] p-2 focus:outline-none focus:ring-0"
                    placeholder="Paste Url"
                  />
                  <div className="flex justify-center items-center">
                    <div className="flex justify-between items-center gap-4">
                      <Button
                        text="Back"
                        size="xl"
                        color="black"
                        classname="bg-[rgb(84, 92, 143)] cursor-pointer"
                        onClick={() => setOpenJoinSpace(false)}
                      />
                      <Button
                        text={loading ? "Joining" : "Join"}
                        color="black"
                        size="xl"
                        classname="bg-[rgb(84, 92, 143)] cursor-pointer"
                        onClick={() => {
                          window.location.href = url;
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {createSpace && (
          <>
            <SpaceCreation onClick={() => setCreateSpace((prev) => !prev)} />
          </>
        )}
        {showAvatarSelection && (
          <div className="fixed top-0 left-0 w-full h-full bg-black opacity-50 z-20">
            {/* Centered Popup */}
            <div
              className="fixed top-1/2 left-1/2 w-[436px] h-[250px] flex flex-col justify-center items-center gap-2 shadow-lg rounded-xl z-30"
              style={{
                backgroundColor: "rgb(84, 92, 143)",
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="flex justify-center gap-10">
                {allAvatars.map((av) => (
                  <img
                    key={av.id}
                    className={`w-[70px] h-[70px] rounded-full ${
                      newAvatarId === av.id ? "border-4 border-green-700" : ""
                    }`}
                    onClick={() => setNewAvatarId(av.id)}
                    src={av.imageUrl}
                    alt=""
                  />
                ))}
              </div>
              <button
                className="bg-green-600 w-[80%] rounded-xl p-2 mt-10"
                onClick={handleUpdateAvatar}
              >
                Update Avatar
              </button>
            </div>
          </div>
        )}
        <button
          className="bg-green-600 w-[100%] rounded-xl p-2"
          onClick={() => setCreateSpace((prev) => !prev)}
        >
          Create Space
        </button>
        <button
          className="bg-green-600 w-[100%] rounded-xl p-2"
          onClick={() => setOpenJoinSpace(true)}
        >
          Join Space
        </button>
        {user.role === "Admin" && (
          <div className="w-[250%] flex gap-4 mr-2">
            <button
              className="bg-green-600 w-[100%] rounded-xl p-2"
              onClick={() => setShowMapCreate((prev) => !prev)}
            >
              Create Map
            </button>
            <button
              className="bg-green-600 w-[100%] rounded-xl p-2"
              onClick={() => setShowCreateElement((prev) => !prev)}
            >
              Create Element
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashNav;
