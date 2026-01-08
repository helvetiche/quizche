interface PageTitleProps {
  children: React.ReactNode;
  className?: string;
}

const PageTitle = ({ children, className = "" }: PageTitleProps) => {
  return (
    <h1 className={`text-4xl font-light text-black ${className}`}>
      {children}
    </h1>
  );
};

export default PageTitle;
