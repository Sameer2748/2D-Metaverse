import axios from "axios";
import React, { useEffect, useState } from "react";
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BACKEND_URL } from "../config";
import { useSetRecoilState } from "recoil";
import { userState } from "../store/userAtom";
import {jwtDecode} from 'jwt-decode';
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";


const SignIn = () => {
  const setUser = useSetRecoilState(userState);


  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setloading] = useState(false);
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setloading(true);
    try {
      console.log({ email, password });

      // Handle Sign-In Logic Here
      const user = await axios.post(`${BACKEND_URL}/signIn`, {
        username: email,
        password,
      });
      console.log(user.data.token);
      await localStorage.setItem("token", `Bearer ${user.data.token}`);

      const res = await axios.get(`${BACKEND_URL}/user/metadata`, {
        headers: { authorization: `Bearer ${user.data.token}` },
      });
      setUser(res.data.user);
      navigate("/dashboard");
      setloading(false);
    } catch (error) {
      setloading(false);
      toast("Error in signing up");
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      console.log(decoded); // This will give you user details from Google
      
      const { email, name, sub } = decoded;

      // Call your backend to register/login the user
      const response = await axios.post(`${BACKEND_URL}/auth/google`, {
        email,
        name,
        googleId: sub,
      });

      await localStorage.setItem("token", `Bearer ${response.data.token}`);
      setUser(response.data.user);
      navigate("/dashboard");
    } catch (error) {
      console.error("Google Login Failed:", error);
    }
  };

  useEffect(() => {
    const fetch = async () => {
      const token = await localStorage.getItem("token");
      if (token) {
        navigate("/dashboard");
      }
    };
    fetch();
  }, []);

  return (
    <div className="w-full h-screen flex justify-center items-center bg-logbg">
      <div className="w-[450px] h-[490px] bg-white text-black flex flex-col  items-center rounded-xl p-2">
        <div className="flex gap-16 pt-6">
          <img
            className=" animate-bounce"
            width={40}
            height={40}
            src="https://cdn.gather.town/v0/b/gather-town.appspot.com/o/images%2Favatars%2Favatar_19_dancing.png?alt=media&token=03c3e96f-9148-42f9-a667-e8aeeba6d558"
            alt=""
          />
          <img
            className=" animate-bounce"
            width={40}
            height={40}
            src="https://cdn.gather.town/v0/b/gather-town.appspot.com/o/images%2Favatars%2Favatar_29_dancing.png?alt=media&token=507cc40a-a280-4f83-9600-69836b64522b"
            alt=""
          />
          <img
            className=" animate-bounce"
            width={40}
            height={40}
            src="https://cdn.gather.town/v0/b/gather-town.appspot.com/o/images%2Favatars%2Favatar_32_dancing.png?alt=media&token=e7d9d5fa-b7bd-41d5-966e-817f147b63d7"
            alt=""
          />
        </div>
        <h1 className="text-[22px] mt-2">Welcome to Gather</h1>
        <div className="w-[80%] bg-black rounded-xl h-[1px] mt-2"></div>

        <div className="w-full mt-2 flex flex-col justify-center items-center">
          <div className="w-[80%] p-1 flex flex-col justify-center gap-1">
            <p className="text-gray-600 text-sm">Username</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-transparent border border-gray-500 text-black rounded-lg h-[40px] p-2 focus:outline-none focus:ring-0"
              placeholder="Enter your email"
            />
          </div>
          <div className="w-[80%] p-1 flex flex-col justify-center gap-1">
            <p className="text-gray-600 text-sm">Password</p>
            <div className="w-full flex border border-gray-500 rounded-lg h-[40px] p-2">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-[95%] bg-transparent text-black border-none focus:outline-none focus:ring-0"
                placeholder="Enter your password"
              />
              <p
                className="flex justify-center items-center cursor-pointer"
                onClick={() => setShow((prev) => !prev)}
              >
                {show ? (
                  <IoEyeOffOutline size={20} />
                ) : (
                  <IoEyeOutline size={20} />
                )}
              </p>
            </div>
          </div>
        </div>
        {loading ? (
          <button
            disabled
            className="w-[80%] h-[40px] flex justify-center items-center bg-green-600 rounded-xl mt-4 text-white"
            onClick={handleSubmit}
          >
            Please Wait
          </button>
        ) : (
          <button
            className="w-[80%] h-[40px] flex justify-center items-center bg-green-600 rounded-xl mt-4 text-white"
            onClick={handleSubmit}
          >
            Sign In
          </button>
        )}
        <div className="w-[80%] h-[1px] bg-gray-600 mt-4"></div>
         <div className="mt-4">
         <GoogleOAuthProvider  clientId={"386994660882-h7rb1picvn8bj50mb28dvl4tfg09dghh.apps.googleusercontent.com"}>
      <GoogleLogin
        onSuccess={handleGoogleLogin}
        onError={() => {
          console.log('Login Failed');
        }}
        />
    </GoogleOAuthProvider>
        </div>
         <p className=" mt-5">
          Don't have an account?{" "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => navigate("/signUp")}
          >
            Sign Up
          </span>
        </p>
       
       
      </div>
    </div>
  );
};

export default SignIn;
