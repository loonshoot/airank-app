const Card = ({ children, danger }) => {
  return danger ? (
    <div className="flex flex-col justify-between border-2 border-red-600">
      {children}
    </div>
  ) : (
    <div className="flex flex-col justify-between border dark:border-gray-600">
      {children}
    </div>
  );
};

Card.Body = ({ children, subtitle, title, image, icon }) => {
  return (
    <div className="flex flex-col p-5 space-y-3 overflow-auto">
      {image && (
        <div className="mb-5">
          <img src={image} alt={title} className="w-full h-auto" />
        </div>
      )}
      {icon && (
        <div className="">
          <img src={icon} alt={title} className="w-auto h-10" />
        </div>
      )}
      <h2 className="text-2xl font-bold">{title}</h2>
      {subtitle && <h3 className="text-light mt-6">{subtitle}</h3>}
      <div className="flex flex-col">{children}</div>
    </div>
  );
};

Card.Empty = ({ children }) => {
  return (
    <div>
      <div className="flex items-center justify-center p-5 bg-gray-100 border-4 border-dashed dark:bg-transparent dark:border-gray-600">
        <p>{children}</p>
      </div>
    </div>
  );
};

Card.Footer = ({ children }) => {
  return (
    <div className="flex flex-row items-center justify-between px-5 py-3 space-x-5 bg-gray-100 border-t-b dark:border-t-gray-600 dark:bg-dark">
      {children}
    </div>
  );
};

Card.Body.displayName = 'Body';
Card.Empty.displayName = 'Empty';
Card.Footer.displayName = 'Footer';

export default Card;
