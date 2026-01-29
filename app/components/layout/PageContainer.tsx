type PageContainerProps = {
  children: React.ReactNode;
};

const PageContainer = ({ children }: PageContainerProps): React.JSX.Element => {
  return (
    <div
      className="flex min-h-screen items-center justify-center py-12 px-4"
      style={{
        background:
          "linear-gradient(to bottom left, rgb(254 243 199), rgb(253 230 138)), linear-gradient(rgba(0, 0, 0, 0.3) 0.5px, transparent 0.5px), linear-gradient(90deg, rgba(0, 0, 0, 0.3) 0.5px, transparent 0.5px)",
        backgroundSize: "auto, 30px 30px",
      }}
    >
      {children}
    </div>
  );
};

export default PageContainer;
