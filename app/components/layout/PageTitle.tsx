interface PageTitleProps {
  children: React.ReactNode;
  className?: string;
}

const PageTitle = ({ children, className = "" }: PageTitleProps) => {
  return (
    <h1 className={`text-5xl md:text-6xl font-black text-gray-900 tracking-tight ${className}`}>
      {children}
    </h1>
  );
};

export default PageTitle;
