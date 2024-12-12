import { BrowserRouter, Route, Routes } from "react-router-dom"
import Home from "./components/Home"
import SignIn from "./components/SignIn"
import SignUp from "./components/SignUp"
import { Toaster } from "sonner"
import DashBoard from "./components/DashBoard"
import { RecoilRoot } from "recoil"

import SpaceArena from "./components/Space"


function App() {

  return (
    <>
    <RecoilRoot>

    <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home/>}  />
      <Route path="/signIn" element={<SignIn/>}  />
      <Route path="/signUp" element={<SignUp/>}  />
      <Route path="/dashboard" element={<DashBoard/>}  />
      <Route path="/space/:spaceId" element={<SpaceArena/>}  />

    </Routes>

    </BrowserRouter>
    </RecoilRoot>
    <Toaster/>
    </>
  )
}

export default App
