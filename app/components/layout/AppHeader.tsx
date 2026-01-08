"use client";

interface AppHeaderProps {
  title: string;
  userEmail?: string;
}

const AppHeader = ({ title, userEmail }: AppHeaderProps) => {
  return (
    <header className="border-b border-black">
      <div className="container mx-auto px-8 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-light text-black">{title}</h1>
        {userEmail && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-black">{userEmail}</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
