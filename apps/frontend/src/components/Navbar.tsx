import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./ui/Button";

const Navbar = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false); // Toggle for mobile menu

  const handleSignIn = () => navigate("/signIn");
  const handleSignUp = () => navigate("/signUp");

  return (
    <nav className="w-full h-[9vh] bg-transparent text-white flex justify-between items-center p-4 md:p-6">
      {/* Logo Section */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl sm:text-3xl md:text-[40px] font-bold">
          Gather
        </h1>
      </div>

      {/* Desktop Buttons */}
      <div className="hidden md:flex gap-4">
        <Button
          text="Sign Up"
          size="lg"
          color="black"
          classname="cursor-pointer"
          onClick={handleSignUp}
        />
        <Button
          text="Sign In"
          size="lg"
          color="black"
          classname="cursor-pointer"
          onClick={handleSignIn}
        />
      </div>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden text-white text-2xl"
        onClick={() => setIsOpen(!isOpen)}
      >
        ☰
      </button>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div
          style={{ backgroundColor: "rgb(58 53 124)" }}
          className="absolute top-[9vh] left-0 w-full  text-white flex flex-col items-center gap-4 p-4 shadow-lg md:hidden"
        >
          <Button
            text="Sign Up"
            size="lg"
            color="black"
            classname="w-full"
            onClick={handleSignUp}
          />
          <Button
            text="Sign In"
            size="lg"
            color="black"
            classname="w-full"
            onClick={handleSignIn}
          />
        </div>
      )}
    </nav>
  );
};

export default Navbar;
