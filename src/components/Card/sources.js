const SourceCard = ({ children, danger }) => {
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
  
  SourceCard.Body = ({ children, subtitle, title }) => {
    return (
      <div className="flex flex-col p-5 space-y-3 overflow-auto">
        {title ? (
          <h2 className="text-2xl font-bold">{title}</h2>
        ) : (
          <div className="w-full h-8 bg-light animate-pulse" />
        )}
        {subtitle && <h3 className="text-light mt-6">{subtitle}</h3>}
        <div className="flex flex-col">{children}</div>
      </div>
    );
  };
  
  SourceCard.Empty = ({ children }) => {
    return (
      <div>
        <div className="flex items-center justify-center p-5 bg-gray-100 border-4 border-dashed dark:bg-transparent dark:border-gray-600">
          <p>{children}</p>
        </div>
      </div>
    );
  };
  
  SourceCard.Footer = ({ children }) => {
    return (
      <div className="flex flex-row items-center justify-between px-5 py-3 space-x-5 bg-gray-100 border-t-b dark:border-t-gray-600 dark:bg-dark">
        {children}
      </div>
    );
  };
  
  SourceCard.Body.displayName = 'Body';
  SourceCard.Empty.displayName = 'Empty';
  SourceCard.Footer.displayName = 'Footer';
  
  export default SourceCard;
  