const Button = ({ children, width, background, border, disabled = false, ...rest }) => {
  return (
    <button
      className={`
        flex items-center justify-center space-x-2 px-4 py-2 font-medium text-sm
        bg-white text-gray-900 border border-gray-300 rounded-md
        hover:bg-green-600 hover:text-gray-900 hover:border-white
        focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2
        transition-all duration-200 ease-in-out
        ${width === "Full" ? "w-full" : "w-auto"}
        ${disabled ? 'opacity-50 cursor-not-allowed hover:bg-white hover:text-gray-900 hover:border-gray-300' : ''}
      `}
      {...rest}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;