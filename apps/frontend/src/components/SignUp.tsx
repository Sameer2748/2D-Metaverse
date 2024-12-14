import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const SignUp = () => {
    const [show, setShow] = useState(false);
    const [loading, setloading] = useState(false);
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [type, setType] = useState('user');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async(e: React.FormEvent) => {
        setloading(true);
        e.preventDefault();
        console.log(name, username, password, type);
        
        try {
            // Handle Sign-In Logic Here
            // Handle Sign-In Logic Here
            const user = await axios.post("http://localhost:3000/api/v1/signUp", {name,username, password, type});
            console.log(user)
            toast("logged in successfully");
            navigate("/signIn")
            setloading(false)
        } catch (error:any) {
            setloading(false)
            console.log(error);
            toast(error.response.data.message);
        }
    };


    useEffect(() => {
        const fetch = async ()=>{
            const token = await localStorage.getItem("token");
            if(token){
                navigate("/dashboard");
            }
        }
        fetch()
    }, [])

    return (
        <div className='w-full h-screen flex justify-center items-center bg-logbg'>
            <div className='w-[450px] h-[550px] bg-white text-black flex flex-col  items-center rounded-xl p-2'>
                <div className='flex gap-16 pt-6'>
                    <img width={40} height={40} src="https://cdn.gather.town/v0/b/gather-town.appspot.com/o/images%2Favatars%2Favatar_19_dancing.png?alt=media&token=03c3e96f-9148-42f9-a667-e8aeeba6d558" alt="" />
                    <img width={40} height={40} src="https://cdn.gather.town/v0/b/gather-town.appspot.com/o/images%2Favatars%2Favatar_29_dancing.png?alt=media&token=507cc40a-a280-4f83-9600-69836b64522b" alt="" />
                    <img width={40} height={40} src="https://cdn.gather.town/v0/b/gather-town.appspot.com/o/images%2Favatars%2Favatar_32_dancing.png?alt=media&token=e7d9d5fa-b7bd-41d5-966e-817f147b63d7" alt="" />
                </div>
                <h1 className='text-[22px] mt-2'>Welcome to Gather</h1>
                <div className='w-[80%] bg-black rounded-xl h-[1px] mt-2'></div>

                <div className='w-full mt-2 flex flex-col justify-center items-center'>
                    <div className='w-[80%] p-1 flex flex-col justify-center gap-1'>
                        <p className='text-gray-600 text-sm'>Name</p>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className='bg-transparent border border-gray-500 text-black rounded-lg h-[40px] p-2 focus:outline-none focus:ring-0'
                            placeholder='Enter your Name'
                        />
                    </div>
                    <div className='w-[80%] p-1 flex flex-col justify-center gap-1'>
                        <p className='text-gray-600 text-sm'>Username</p>
                        <input
                            type="email"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className='bg-transparent border border-gray-500 text-black rounded-lg h-[40px] p-2 focus:outline-none focus:ring-0'
                            placeholder='Enter your username'
                        />
                    </div>
                    
                    <div className='w-[80%] p-1 flex flex-col justify-center gap-1'>
                        <p className='text-gray-600 text-sm'>Password</p>
                        <div className='w-full flex border border-gray-500 rounded-lg h-[40px] p-2'>
                            <input
                                type={show ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className='w-[95%] bg-transparent text-black border-none focus:outline-none focus:ring-0'
                                placeholder='Enter your password'
                            />
                            <p className='flex justify-center items-center cursor-pointer' onClick={() => setShow((prev) => !prev)}>
                                {show ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
                            </p>
                        </div>
                    </div>
                        <p className='text-[20px] mt-3 mb-3'>Type</p>
                    <div className='w-full flex justify-center items-center gap-4 mb-2'>
                        <button className={`w-[80px] h-[40px] border ${type === "admin" ? "bg-green-700 text-white" : "text-black"}  bg-transparent border-gray-600 p-2 rounded-xl flex justify-center items-center `} onClick={()=> setType("admin")}>Admin</button>
                        <button className={`w-[80px] h-[40px] border ${type === "user" ? "bg-green-700 text-white" : "text-black"} bg-transparent border-gray-600 p-2 rounded-xl flex justify-center items-center `} onClick={()=> setType("user")}>user</button>
                    </div>
                </div>
                {
                    loading ? 
                    <button disabled className='w-[80%] h-[40px] flex justify-center items-center bg-green-600 rounded-xl mt-4 text-white' onClick={handleSubmit}>Please Wait</button>
                    :
                    <button className='w-[80%] h-[40px] flex justify-center items-center bg-green-600 rounded-xl mt-4 text-white' onClick={handleSubmit}>Sign Up</button>

                }
            </div>
        </div>
    );
};

export default SignUp;