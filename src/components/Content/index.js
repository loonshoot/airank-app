const Content = ({ children }) => {
  return (
    <div className="flex flex-col h-full px-5 pb-5 [&>*+*]:pt-5 overflow-y-auto md:p-10 md:w-3/4 bg-[#0a0a0a]">
      {children}
    </div>
  );
};

Content.Container = ({ children }) => {
  return <div className="flex flex-col pb-10 space-y-5">{children}</div>;
};

Content.Divider = ({ thick }) => {
  return thick ? (
    <hr className="border-none" />
  ) : (
    <hr className="border-none" />
  );
};

Content.Empty = ({ children }) => {
  return (
    <div>
      <div className="flex items-center justify-center p-5 bg-zinc-800/50 border-2 border-dashed border-zinc-700 rounded-lg">
        <p className="text-gray-400">{children}</p>
      </div>
    </div>
  );
};

Content.Title = ({ subtitle, title }) => {
  return (
    <div>
      <h1 className="text-3xl font-bold md:text-4xl text-green-600">{title}</h1>
      <h3 className="text-light mt-4">{subtitle}</h3>
    </div>
  );
};

Content.Container.displayName = 'Container';
Content.Divider.displayName = 'Divider';
Content.Empty.displayName = 'Empty';
Content.Title.displayName = 'Title';

export default Content;
