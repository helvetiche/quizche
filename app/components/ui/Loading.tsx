"use client";

import { useEffect, useState } from "react";

const Loading = () => {
  const [activeLight, setActiveLight] = useState(0); // 0 = red, 1 = orange, 2 = green

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLight((prev) => (prev + 1) % 3);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="flex min-h-screen items-center justify-center animate-fadeIn"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(17,24,39,0.08) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(17,24,39,0.08) 1px, transparent 1px),
          linear-gradient(to bottom right, rgb(254 243 199), rgb(253 230 138))
        `,
        backgroundSize: "48px 48px, 48px 48px, 100% 100%",
      }}
    >
      <div className="flex flex-col items-center gap-5">
        {/* Traffic lights */}
        <div className="flex gap-3">
          <div 
            className={`w-8 h-8 rounded-full border-3 border-gray-900 transition-all duration-200 ${
              activeLight === 0 ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]" : "bg-gray-300"
            }`}
          ></div>
          <div 
            className={`w-8 h-8 rounded-full border-3 border-gray-900 transition-all duration-200 ${
              activeLight === 1 ? "bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.7)]" : "bg-gray-300"
            }`}
          ></div>
          <div 
            className={`w-8 h-8 rounded-full border-3 border-gray-900 transition-all duration-200 ${
              activeLight === 2 ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.7)]" : "bg-gray-300"
            }`}
          ></div>
        </div>

        {/* Loading text */}
        <p className="text-sm font-bold text-gray-600">Preparing your materials...</p>
      </div>
    </div>
  );
};

export default Loading;
