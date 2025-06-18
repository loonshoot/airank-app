const Toggle = ({ checked, onChange, label }) => {
  return (
    <label className="inline-flex items-center me-5 cursor-pointer">
      <input 
        type="checkbox" 
        className="sr-only peer" 
        checked={checked}
        onChange={onChange}
      />
      <div className="relative w-11 h-6 bg-grey-200 peer peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-pink-600 dark:peer-checked:bg-purple-600"></div>
      {label && <span className="ms-3 text-sm font-medium text-white dark:text-gray-300">{label}</span>}
    </label>
  );
};

export default Toggle; 