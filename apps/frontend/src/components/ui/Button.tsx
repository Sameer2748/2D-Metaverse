
interface buttonProps {
    text: string;
    size:string;
    color:string;
    onClick?: () => void;
    classname?: string
  
}
const Button = ({text, size,color,onClick, classname}: buttonProps) => {
  return (
    <div className={`w-[110px] h-[40px] bg-white rounded-xl flex justify-center items-center ${classname}`} onClick={onClick}>
        <p className={`text-${size} text-${color} `}>
            {text}
        </p>
    </div>
  )
}

export default Button