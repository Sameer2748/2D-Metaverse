import React, { useEffect } from 'react'
import Navbar from './Navbar'
import { useNavigate } from 'react-router-dom'

const Home = () => {
  const navigate = useNavigate();
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
    <div className='w-[full] h-screen bg-Hero '>
        <Navbar />
        <div className='w-full h-[70%] flex justify-center items-center'>
          <div className=' w-full h-full flex flex-col justify-center p-8 pl-12 pr-12 ml-10 gap-4 '>
            <h1 className='text-[46px] font-bold '>Your <span className='text-blue-300'>Virtual HQ</span> </h1>
            <p className='w-[80%] text-xl text-gray-300'>Gather brings the best of in-person collaboration to distributed teams</p>
          </div>
          <div className='w-full h-full flex justify-center items-center pr-20'>
            <video width={500} height={500} src="https://cdn.vidzflow.com/v/h3yy6rTnJQ_720p_1691443174.mp4" className='rounded-xl' loop={true} autoPlay={true}></video>
          </div>
        </div>
    </div>
  )
}

export default Home