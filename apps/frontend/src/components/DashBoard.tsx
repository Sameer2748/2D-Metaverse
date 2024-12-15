import React, { useEffect, useState } from "react";
import DashNav from "./DashNav";
import { useRecoilState } from "recoil";
import { userState } from "../store/userAtom";
import axios from "axios";
import { spaceState } from "../store/spaceAtom";
import { toast } from "sonner";
import { RiDeleteBin7Line } from "react-icons/ri";
import Button from "./ui/Button";
import { useNavigate } from "react-router-dom";

const DashBoard = () => {
  const [user, setUser] = useRecoilState(userState);
  const [spaces, setSpaces] = useRecoilState(spaceState);
  const [DeleteModal, setDeleteModal] = useState(false);
  const [selectedSpaceid, setSelectedSpaceid] = useState("");
  const navigate = useNavigate();

  useEffect(() => {

    const fetch = async () => {
      const token  = await localStorage.getItem("token")

      if(!token){
        navigate("/")
      }

      const res = await axios.get(
        "http://localhost:3000/api/v1/user/metadata",
        { headers: { authorization: localStorage.getItem("token") } }
      );
      const res2 = await axios.get("http://localhost:3000/api/v1/space/all", {
        headers: { authorization: localStorage.getItem("token") },
      });
      setSpaces(res2.data.spaces);
      setUser(res.data.user);
      console.log(res2.data.spaces);
    };
    fetch();
  }, []);

  const HandleOpenDelete = (spaceId: string) => {
    setSelectedSpaceid(spaceId);
    setDeleteModal(true);
  };
  const handleCancel = () => {
    setDeleteModal(false);
    setSelectedSpaceid("");
  };
  const handleDelete = async (spaceId: string) => {
    console.log(spaceId);

    try {
      const res = await axios.delete(
        `http://localhost:3000/api/v1/space/${spaceId}`,
        {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        }
      );
      await setSpaces(spaces.filter((s) => s.id !== spaceId)); // Remove deleted space from the state
      toast("Space deleted successfully");
      setDeleteModal(false);
    setSelectedSpaceid("");
    } catch (error) {
      toast("Error deleting");
    }
  };

  return (
    <div className="bg-Hero w-full h-screen bg-[#282d4e]">
      <DashNav />
      {/* Content */}
      <div className="w-[100%] h-[80%] grid grid-cols-12  p-8 justify-center gap-3 ">
        {
          spaces.length >0 ?(
              spaces.map((space) => (
                <div
                  key={space?.id}
                  className="col-span-12 md:col-span-6 lg:col-span-4 h-[300px] p-2 "
                >
                  <div className="w-full h-[80%] ">
                    <img onClick={()=> navigate(`/space/${space?.id}`)}
                      className="w-full h-full rounded-xl hover:border-4 hover:border-[#545c8f] cursor-pointer "
                      src={`${space?.thumbnail}`}
                      alt=""
                    />
                  </div>
                  <div className="flex w-full justify-between items-center p-2">
                    <h1>{space?.name}</h1>
                    <p
                      onClick={() => HandleOpenDelete(space?.id)}
                      className="cursor-pointer"
                    >
                      <RiDeleteBin7Line width={40} height={40} />
                    </p>
                  </div>
                </div>
              )) || <p>Loading...</p> // Display loading message while data is being fetched
          ):(
            <div className="w-[95vw] h-full flex justify-center items-center">
            <p>No Space Found! Create New Space.</p>
            </div>
          )
        }
      </div>

      {DeleteModal && (
        <>
          <div className="fixed top-0 left-0 w-full h-full bg-black opacity-50 z-20"></div>
          <div
            className="fixed top-1/2 left-1/2 w-[500px] h-[150px] flex flex-col justify-center items-center gap-2 shadow-lg rounded-xl z-30"
            style={{
              backgroundColor: "rgb(40, 45, 78)",
              transform: "translate(-50%, -50%)",
            }}
          >
            <p className="text-xl font-semibold">Are you sure you want to delete this Space?</p>
            <div className="w-[50%] flex justify-between items-center mt-4">
            <Button text="Cancel" size="xl" color="black" classname="cursor-pointer" onClick={handleCancel} />
            <Button text="Delete" size="xl" color="black" classname=" text-white cursor-pointer" onClick={() => handleDelete(selectedSpaceid)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashBoard;
