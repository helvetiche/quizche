/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition */
"use client";

import type { ReactElement } from "react";
import GoogleAuthButton from "./components/GoogleAuthButton";
import RoleSelection from "./components/RoleSelection";
import ProfileSetup from "./components/auth/ProfileSetup";
import PageContainer from "./components/layout/PageContainer";
import MainLayout from "./components/layout/MainLayout";
import Loading from "./components/ui/Loading";
import CardSwap, { Card } from "../components/CardSwap";
import { useAuth } from "./components/auth/useAuth";

export default function Home(): ReactElement {
  const {
    user,
    userRole,
    profileCompleted,
    idToken,
    loading,
    handleLoginSuccess,
  } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (user && !userRole && idToken) {
    return (
      <PageContainer>
        <MainLayout>
          <RoleSelection idToken={idToken} />
        </MainLayout>
      </PageContainer>
    );
  }

  if (
    user &&
    userRole !== undefined &&
    userRole !== null &&
    idToken &&
    profileCompleted === false
  ) {
    return (
      <PageContainer>
        <MainLayout>
          <ProfileSetup idToken={idToken} />
        </MainLayout>
      </PageContainer>
    );
  }

  // Landing page for unauthenticated users
  return (
    <div
      className="h-screen flex flex-col relative overflow-hidden"
      style={{
        background:
          "linear-gradient(to bottom left, rgb(254 243 199), rgb(253 230 138)), linear-gradient(rgba(0, 0, 0, 0.3) 0.5px, transparent 0.5px), linear-gradient(90deg, rgba(0, 0, 0, 0.3) 0.5px, transparent 0.5px)",
        backgroundSize: "auto, 30px 30px",
      }}
    >
      {/* Corner Plus Icons */}
      <div className="absolute top-8 left-8 w-16 h-16 flex items-center justify-center z-20">
        <span className="text-gray-900 text-8xl font-black">+</span>
      </div>
      <div className="absolute top-8 right-8 w-16 h-16 flex items-center justify-center z-20">
        <span className="text-gray-900 text-8xl font-black">+</span>
      </div>
      <div className="absolute bottom-8 left-8 w-16 h-16 flex items-center justify-center z-20">
        <span className="text-gray-900 text-8xl font-black">+</span>
      </div>

      {/* Navigation 
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20">
        <nav className="flex items-center gap-8 bg-amber-150 border-2 border-black rounded-full px-1 py-1">
          <span className="material-icons-outlined text-gray-900 text-3xl cursor-pointer p-2 ">
            menu_book
          </span>
          <span className="material-icons-outlined text-gray-900 text-3xl cursor-pointer p-2">
            auto_awesome
          </span>
          <span className="material-icons-outlined text-gray-900 text-3xl cursor-pointer p-2">
            groups
          </span>
          <span className="material-icons-outlined text-amber-100 aspect-square text-3xl cursor-pointer bg-black rounded-full p-2">
            email
          </span>
        </nav>
      </div>
      */}
      {/* Hero Section */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center px-6 py-12 gap-12">
        {/* Left Side - Title */}
        <div className="flex-1 max-w-xl text-center lg:text-left">
          <h1 className="text-7xl font-bold border-l-12 pl-4 border-black font-black text-black mb-6 leading-none tracking-tight">
            21ST CENTURY LEARNING
          </h1>
          <p className="text-2xl font-medium text-black mb-8 leading-tight">
            [ Developed by students, made for students ]
          </p>
          <div className="space-y-4">
            <p className="text-lg text-gray-700 font-medium text-justify">
              Quizche transforms PDFs into interactive flashcards and quizzes.
              Students collaborate, review, and master lessons together, while
              teachers instantly create assessments from learning materials,
              making studying faster, smarter, and more engaging for everyone
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <GoogleAuthButton onLoginSuccess={handleLoginSuccess} />
            </div>
          </div>
        </div>

        {/* Right Side - CardSwap Animation */}
        <div className="flex-1 max-w-2xl relative">
          <div className="aspect-[4/3] relative">
            <CardSwap
              width="100%"
              height="100%"
              cardDistance={25}
              verticalDistance={30}
              delay={3000}
              pauseOnHover={true}
              skewAmount={4}
              easing="elastic"
            >
              {/* Quiz Creation Card */}
              <Card customClass="bg-amber-100 border-4 border-black relative">
                {/* macOS Traffic Lights */}
                <div className="absolute top-4 left-4 flex gap-2 z-10">
                  <div className="w-5 h-5 bg-red-500 rounded-full border-2 border-black"></div>
                  <div className="w-5 h-5 bg-yellow-500 rounded-full border-2 border-black"></div>
                  <div className="w-5 h-5 bg-green-500 rounded-full border-2 border-black"></div>
                </div>
                {/* Card Icon */}
                <div className="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center border-2 border-black z-10">
                  <span className="material-icons-outlined text-black text-2xl">
                    quiz
                  </span>
                </div>
                {/* Separator Line */}
                <div className="absolute top-20 left-0 right-0 h-0.5 bg-black z-10"></div>
                <div className="h-full flex flex-col justify-start items-start p-8 pt-24 text-gray-900">
                  <h3 className="text-3xl font-black mb-2 text-left">
                    Quiz Magic
                  </h3>
                  <h4 className="text-xl font-semibold mb-3 text-left text-gray-900">
                    [ turn any content into quizzes ]
                  </h4>
                  {/* Chat Bubbles */}
                  <div className="flex flex-col gap-4 mt-6 w-full">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-pink-500 border-2 border-black rounded-full flex items-center justify-center text-black text-base font-black flex-shrink-0 relative">
                        A
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-400 border border-black rounded-full"></div>
                      </div>
                      <div className="bg-cyan-400 border-2 border-black rounded-2xl rounded-tl-md px-6 py-3 w-1/2">
                        <p className="text-base text-black font-bold">
                          This quiz is amazing Generated from my PDF in seconds.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 ml-auto flex-row-reverse">
                      <div className="w-10 h-10 bg-purple-500 border-2 border-black rounded-full flex items-center justify-center text-black text-base font-black flex-shrink-0 relative">
                        Q
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-400 border border-black rounded-full"></div>
                      </div>
                      <div className="bg-magenta-400 border-2 border-black rounded-2xl rounded-tr-md px-6 py-3 w-full">
                        <p className="text-base text-black font-bold">
                          Thanks Created in seconds with AI-powered analysis.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-pink-500 border-2 border-black rounded-full flex items-center justify-center text-black text-base font-black flex-shrink-0 relative">
                        A
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-400 border border-black rounded-full"></div>
                      </div>
                      <div className="bg-cyan-400 border-2 border-black rounded-2xl rounded-tl-md px-6 py-3 w-1/2">
                        <p className="text-base text-black font-bold">
                          My students are loving the instant feedback too
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Flashcards Card */}
              <Card customClass="bg-amber-100 border-4 border-black relative">
                {/* macOS Traffic Lights */}
                <div className="absolute top-4 left-4 flex gap-2 z-10">
                  <div className="w-5 h-5 bg-red-500 rounded-full border-2 border-black"></div>
                  <div className="w-5 h-5 bg-yellow-500 rounded-full border-2 border-black"></div>
                  <div className="w-5 h-5 bg-green-500 rounded-full border-2 border-black"></div>
                </div>
                {/* Card Icon */}
                <div className="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center border-2 border-black z-10">
                  <span className="material-icons-outlined text-black text-2xl">
                    library_books
                  </span>
                </div>
                {/* Separator Line */}
                <div className="absolute top-20 left-0 right-0 h-0.5 bg-black z-10"></div>
                <div className="h-full flex flex-col justify-start items-start p-8 pt-24 text-gray-900">
                  <h3 className="text-3xl font-black mb-2 text-left">
                    Road To Succession
                  </h3>
                  <h4 className="text-xl font-semibold mb-3 text-left text-gray-900">
                    [ pen and paper is not enough ]
                  </h4>
                  {/* Chat Bubbles */}
                  <div className="flex flex-col gap-4 mt-6 w-full">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-red-500 border-2 border-black rounded-full flex items-center justify-center text-black text-base font-black flex-shrink-0 relative">
                        S
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-400 border border-black rounded-full"></div>
                      </div>
                      <div className="bg-lime-400 border-2 border-black rounded-2xl rounded-tl-md px-6 py-3 w-1/2">
                        <p className="text-base text-black font-bold">
                          Finally acing my exams These flashcards are
                          revolutionary.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 ml-auto flex-row-reverse">
                      <div className="w-10 h-10 bg-orange-500 border-2 border-black rounded-full flex items-center justify-center text-black text-base font-black flex-shrink-0 relative">
                        F
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-400 border border-black rounded-full"></div>
                      </div>
                      <div className="bg-pink-400 border-2 border-black rounded-2xl rounded-tr-md px-6 py-3 w-full">
                        <p className="text-base text-black font-bold">
                          Smart repetition algorithm adapts to your learning
                          pace
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-red-500 border-2 border-black rounded-full flex items-center justify-center text-black text-base font-black flex-shrink-0 relative">
                        S
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-400 border border-black rounded-full"></div>
                      </div>
                      <div className="bg-lime-400 border-2 border-black rounded-2xl rounded-tl-md px-6 py-3 w-1/2">
                        <p className="text-base text-black font-bold">
                          No more wasting time on ineffective study methods
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Student Dashboard Card */}
              <Card customClass="bg-amber-100 border-4 border-black relative">
                {/* macOS Traffic Lights */}
                <div className="absolute top-4 left-4 flex gap-2 z-10">
                  <div className="w-5 h-5 bg-red-500 rounded-full border-2 border-black"></div>
                  <div className="w-5 h-5 bg-yellow-500 rounded-full border-2 border-black"></div>
                  <div className="w-5 h-5 bg-green-500 rounded-full border-2 border-black"></div>
                </div>
                {/* Card Icon */}
                <div className="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center border-2 border-black z-10">
                  <span className="material-icons-outlined text-black text-2xl">
                    dashboard
                  </span>
                </div>
                {/* Separator Line */}
                <div className="absolute top-20 left-0 right-0 h-0.5 bg-black z-10"></div>
                <div className="h-full flex flex-col justify-start items-start p-8 pt-24 text-gray-900">
                  <h3 className="text-3xl font-black mb-2 text-left">
                    Your Learning Journey
                  </h3>
                  <h4 className="text-xl font-semibold mb-3 text-left text-gray-900">
                    [ watch yourself grow ]
                  </h4>
                  {/* Chat Bubbles */}
                  <div className="flex flex-col gap-4 mt-6 w-full">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-cyan-500 border-2 border-black rounded-full flex items-center justify-center text-black text-base font-black flex-shrink-0 relative">
                        T
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-400 border border-black rounded-full"></div>
                      </div>
                      <div className="bg-orange-400 border-2 border-black rounded-2xl rounded-tl-md px-6 py-3 w-1/2">
                        <p className="text-base text-black font-bold">
                          Top of the leaderboard This dashboard is so
                          motivating.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 ml-auto flex-row-reverse">
                      <div className="w-10 h-10 bg-magenta-500 border-2 border-black rounded-full flex items-center justify-center text-black text-base font-black flex-shrink-0 relative">
                        D
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-400 border border-black rounded-full"></div>
                      </div>
                      <div className="bg-green-400 border-2 border-black rounded-2xl rounded-tr-md px-6 py-3 w-full">
                        <p className="text-base text-black font-bold">
                          Keep climbing Your progress analytics show great
                          improvement
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-cyan-500 border-2 border-black rounded-full flex items-center justify-center text-black text-base font-black flex-shrink-0 relative">
                        T
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-400 border border-black rounded-full"></div>
                      </div>
                      <div className="bg-orange-400 border-2 border-black rounded-2xl rounded-tl-md px-6 py-3 w-1/2">
                        <p className="text-base text-black font-bold">
                          Love seeing my weak areas highlighted for improvement
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Teacher Analytics Card */}
              <Card customClass="bg-amber-100 border-4 border-black relative">
                {/* macOS Traffic Lights */}
                <div className="absolute top-4 left-4 flex gap-2 z-10">
                  <div className="w-5 h-5 bg-red-500 rounded-full border-2 border-black"></div>
                  <div className="w-5 h-5 bg-yellow-500 rounded-full border-2 border-black"></div>
                  <div className="w-5 h-5 bg-green-500 rounded-full border-2 border-black"></div>
                </div>
                {/* Card Icon */}
                <div className="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center border-2 border-black z-10">
                  <span className="material-icons-outlined text-black text-2xl">
                    analytics
                  </span>
                </div>
                {/* Separator Line */}
                <div className="absolute top-20 left-0 right-0 h-0.5 bg-black z-10"></div>
                <div className="h-full flex flex-col justify-start items-start p-8 pt-24 text-gray-900">
                  <h3 className="text-3xl font-black mb-2 text-left">
                    Teaching Superpowers
                  </h3>
                  <h4 className="text-xl font-semibold mb-3 text-left text-gray-900">
                    [ understand your students better ]
                  </h4>
                  {/* Chat Bubbles */}
                  <div className="flex flex-col gap-4 mt-6 w-full">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-lime-500 border-2 border-black rounded-full flex items-center justify-center text-black text-base font-black flex-shrink-0 relative">
                        P
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-400 border border-black rounded-full"></div>
                      </div>
                      <div className="bg-purple-400 border-2 border-black rounded-2xl rounded-tl-md px-6 py-3 w-1/2">
                        <p className="text-base text-black font-bold">
                          My students are improving dramatically with these
                          insights
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 ml-auto flex-row-reverse">
                      <div className="w-10 h-10 bg-cyan-500 border-2 border-black rounded-full flex items-center justify-center text-black text-base font-black flex-shrink-0 relative">
                        A
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-400 border border-black rounded-full"></div>
                      </div>
                      <div className="bg-red-400 border-2 border-black rounded-2xl rounded-tr-md px-6 py-3 w-full">
                        <p className="text-base text-black font-bold">
                          Detailed performance analytics help you personalize
                          teaching
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-lime-500 border-2 border-black rounded-full flex items-center justify-center text-black text-base font-black flex-shrink-0 relative">
                        P
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-400 border border-black rounded-full"></div>
                      </div>
                      <div className="bg-purple-400 border-2 border-black rounded-2xl rounded-tl-md px-6 py-3 w-1/2">
                        <p className="text-base text-black font-bold">
                          Finally understanding which concepts need more
                          attention
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </CardSwap>
          </div>
        </div>
      </div>
    </div>
  );
}
