const Button = ({ children, width, background, border, disabled = false, ...rest }) => {
  return (
    <div className={`group h-8 relative mt-5 mb-5 ${
      width === "Full" ? "w-full" : "w-40"
    }`}>
      <button
        className={`flex items-center h-8 absolute ${
          background === "Yellow" ? "bg-yellow-400" : ""
        } ${
          background === "Pink" ? "bg-pink-600" : ""
        } ${
          background === "Red" ? "bg-red-500" : ""
        } ${
          width === "Full" ? "w-full" : "w-40"
        } ${
          disabled ? 'opacity-50 cursor-not-allowed' : '' 
        }`} // Add disabled styling
        {...rest}
        disabled={disabled} // Pass disabled prop to the button
      >
        <div 
          className="flex items-center w-full text-center text-slate-900 text-light text-xs font-normal font-mono"
        >
          <p className={`flex items-center justify-center text-center space-x-2 w-full pt-1 group-hover:pt-0 ${
            background === "Yellow" ? "text-dark" : ""
          } ${
            background === "Pink" ? "text-light" : ""
          } ${
            background === "Red" ? "text-light" : ""
          }`}>{children}</p>
        </div>
      </button>
      <div
        className={`flex h-8 top-1 left-1 group-hover:top-0 group-hover:left-0 absolute border-solid border-2 ${
          border === "Dark" ? "border-dark" : ""
        } ${border === "Light" ? "border-light" : ""} ${
          width === "Full" ? "w-full" : "w-40"
        }`}
        {...rest}
      ></div>
    </div>
  );
};

export default Button;