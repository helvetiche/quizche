"use client";

import { useState } from "react";

interface QuizWarningModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

const QuizWarningModal = ({
  isOpen,
  onAccept,
  onCancel,
}: QuizWarningModalProps) => {
  const [accepted, setAccepted] = useState(false);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (accepted) {
      onAccept();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white border-2 border-black p-8 max-w-2xl mx-4 flex flex-col gap-6">
        <h2 className="text-3xl font-light text-black">
          Quiz Integrity Policy
        </h2>

        <div className="flex flex-col gap-4 text-base font-light text-black">
          <p>
            Before you begin this quiz, please read and acknowledge the
            following integrity policies:
          </p>

          <div className="flex flex-col gap-3 pl-4 border-l-2 border-gray-300">
            <p className="font-medium">Anti-Cheating Measures:</p>
            <ul className="flex flex-col gap-2 list-disc list-inside">
              <li>Tab switching is monitored and limited</li>
              <li>Time away from the quiz window is tracked</li>
              <li>Page refresh will result in immediate disqualification</li>
              <li>
                All violations are recorded and visible to your instructor
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 pl-4 border-l-2 border-gray-300">
            <p className="font-medium">Important Rules:</p>
            <ul className="flex flex-col gap-2 list-disc list-inside">
              <li>You may switch tabs a maximum of 3 times</li>
              <li>
                Being away from the window for more than 5 seconds will be
                flagged
              </li>
              <li>
                Refreshing the page will immediately disqualify you from the
                quiz
              </li>
              <li>All cheating attempts are logged in real-time</li>
            </ul>
          </div>

          <p className="text-red-600 font-medium">
            By proceeding, you acknowledge that you understand these policies
            and agree to abide by them.
          </p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-gray-50">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="w-5 h-5 border-2 border-black"
          />
          <span className="text-base font-light text-black">
            I have read and agree to the quiz integrity policy
          </span>
        </label>

        <div className="flex gap-4 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={!accepted}
            className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizWarningModal;
