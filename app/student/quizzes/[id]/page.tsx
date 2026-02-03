/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
"use client";

import { useRouter } from "next/navigation";
import AuthGuard from "../../../components/auth/AuthGuard";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import Loading from "../../../components/ui/Loading";
import QuizWarningModal from "../../../components/create/QuizWarningModal";
import StudentQuizHeader from "../../../components/dashboard/student/quiz/StudentQuizHeader";
import StudentQuizQuestion from "../../../components/dashboard/student/quiz/StudentQuizQuestion";
import StudentQuizActions from "../../../components/dashboard/student/quiz/StudentQuizActions";
import { useStudentQuiz } from "../../../components/dashboard/student/quiz/hooks/useStudentQuiz";

export default function TakeQuizPage() {
  const router = useRouter();
  const {
    user,
    setUser,
    loading,
    error,
    quiz,
    answers,
    alreadyTaken,
    showWarning,
    quizStarted,
    cheatingAlert,
    timeRemaining,
    submitting,
    antiCheat,
    handleStartQuiz,
    handleCancelWarning,
    handleAnswerChange,
    handleSubmit,
    formatTime,
    idToken,
  } = useStudentQuiz();

  if (loading && (idToken === null || idToken === "")) {
    return <Loading />;
  }

  return (
    <AuthGuard requiredRole="student" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - Take Quiz"
        userEmail={user?.email}
        userRole="student"
      >
        <QuizWarningModal
          isOpen={showWarning}
          onAccept={() => void handleStartQuiz()}
          onCancel={handleCancelWarning}
        />

        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
          {error !== null && error !== "" ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-lg font-light text-red-600">{error}</p>
              <button
                onClick={() => router.push("/student")}
                className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          ) : quiz ? (
            alreadyTaken ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <p className="text-lg font-light text-red-600">
                  You have already taken this quiz. Each quiz can only be taken
                  once.
                </p>
                <button
                  onClick={() => router.push("/student")}
                  className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            ) : !quizStarted ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <p className="text-lg font-light text-black">
                  Please accept the quiz integrity policy to begin.
                </p>
              </div>
            ) : (
              <>
                <StudentQuizHeader
                  quiz={quiz}
                  timeRemaining={timeRemaining}
                  cheatingAlert={cheatingAlert}
                  isDisqualified={antiCheat.isDisqualified}
                  formatTime={formatTime}
                />

                <div className="flex flex-col gap-6">
                  {quiz.questions.map((question, index) => (
                    <StudentQuizQuestion
                      key={index}
                      question={question}
                      index={index}
                      answer={answers[index]}
                      onAnswerChange={handleAnswerChange}
                      disabled={antiCheat.isDisqualified}
                    />
                  ))}
                </div>

                <StudentQuizActions
                  onCancel={() => router.push("/student")}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                  disabled={submitting || antiCheat.isDisqualified}
                />
              </>
            )
          ) : null}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
