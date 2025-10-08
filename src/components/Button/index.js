const Button = ({ children, width, background, border, disabled = false, variant = 'default', ...rest }) => {
  // Match the website's CTA button style
  const getVariantClasses = () => {
    // Support legacy background prop
    if (background === 'Green' || background === 'Pink') {
      return 'bg-green-600 text-black hover:bg-green-600/90 border-green-600 shadow-lg shadow-green-600/20 hover:shadow-green-600/40';
    }

    if (variant === 'cta' || variant === 'primary') {
      return 'bg-green-600 text-black hover:bg-green-600/90 border-green-600 shadow-lg shadow-green-600/20 hover:shadow-green-600/40';
    }
    if (variant === 'secondary') {
      return 'bg-zinc-800 text-white hover:bg-zinc-700 border-zinc-700';
    }
    // Default variant
    return 'bg-green-600 text-black hover:bg-green-600/90 border-green-600';
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center space-x-2 px-6 py-2 font-semibold text-sm rounded-lg
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-zinc-900
        ${getVariantClasses()}
        ${width === "Full" ? "w-full" : "w-auto"}
        ${disabled ? 'opacity-50 cursor-not-allowed hover:bg-green-600 hover:shadow-none' : ''}
      `}
      {...rest}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;