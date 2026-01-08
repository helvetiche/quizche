"use client";

import Link from "next/link";

interface CreateCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

const CreateCard = ({ title, description, href, icon }: CreateCardProps) => {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-4 p-8 border-2 border-black bg-white hover:bg-gray-50 transition-colors"
    >
      <div className="w-16 h-16 flex items-center justify-center text-4xl">
        {icon}
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h3 className="text-xl font-light text-black">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </Link>
  );
};

export default CreateCard;
