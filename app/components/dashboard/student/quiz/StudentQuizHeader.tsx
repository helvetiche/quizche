/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { Quiz } from "./types";

type StudentQuizHeaderProps = {
  quiz: Quiz;
  timeRemaining: number | null;
  cheatingAlert: string | null;
  isDisqualified: boolean;
  formatTime: (seconds: number) => string;
};

export default function StudentQuizHeader({
  quiz,
  timeRemaining,
  cheatingAlert,
  isDisqualified,
  formatTime,
}: StudentQuizHeaderProps) {
  return (
    <>
      {cheatingAlert && (
        <div
          className={`p-4 border-2 ${
            isDisqualified
              ? "bg-red-50 border-red-600 text-red-800"
              : "bg-yellow-50 border-yellow-600 text-yellow-800"
          }`}
        >
          <p className="font-light">{cheatingAlert}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-light text-black">{quiz.title}</h2>
          {quiz.description && (
            <p className="text-lg font-light text-gray-600">
              {quiz.description}
            </p>
          )}
        </div>
        {timeRemaining !== null && (
          <div className="px-6 py-3 bg-black text-white font-light">
            Time Remaining: {formatTime(timeRemaining)}
          </div>
        )}
      </div>
    </>
  );
}
