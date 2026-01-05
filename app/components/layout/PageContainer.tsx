interface PageContainerProps {
  children: React.ReactNode;
}

const PageContainer = ({ children }: PageContainerProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      {children}
    </div>
  );
};

export default PageContainer;
