type MainLayoutProps = {
  children: React.ReactNode;
};

const MainLayout = ({ children }: MainLayoutProps): React.JSX.Element => {
  return (
    <main className="flex flex-col items-center gap-8 px-8 py-16">
      {children}
    </main>
  );
};

export default MainLayout;
