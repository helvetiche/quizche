"use client";

import { useState } from "react";
import Modal from "@/components/Modal";

type QuizWarningModalProps = {
  isOpen: boolean;
  onAccept: () => void;
  onCancel: () => void;
};

const QuizWarningModal = ({
  isOpen,
  onAccept,
  onCancel,
}: QuizWarningModalProps) => {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (accepted) {
      onAccept();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="max-w-2xl mx-4">
      <div className="bg-amber-50 border-3 border-gray-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] p-8 flex flex-col gap-6">
        <h2 className="text-2xl font-black text-gray-900">
          Quiz Integrity Policy
        </h2>

        <div className="flex flex-col gap-4 text-sm font-medium text-gray-700">
          <p>
            Before you begin this quiz, please read and acknowledge the
            following integrity policies:
          </p>

          <div className="flex flex-col gap-3 pl-4 border-l-4 border-amber-400 bg-amber-100 p-4 rounded-r-xl">
            <p className="font-black text-gray-900">Anti-Cheating Measures:</p>
            <ul className="flex flex-col gap-2 list-disc list-inside text-gray-700">
              <li>Tab switching is monitored and limited</li>
              <li>Time away from the quiz window is tracked</li>
              <li>Page refresh will result in immediate disqualification</li>
              <li>
                All violations are recorded and visible to your instructor
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 pl-4 border-l-4 border-amber-400 bg-amber-100 p-4 rounded-r-xl">
            <p className="font-black text-gray-900">Important Rules:</p>
            <ul className="flex flex-col gap-2 list-disc list-inside text-gray-700">
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

          <p className="text-red-600 font-bold bg-red-100 border-2 border-red-400 rounded-xl p-3">
            By proceeding, you acknowledge that you understand these policies
            and agree to abide by them.
          </p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-4 bg-white border-2 border-gray-900 rounded-xl hover:bg-amber-50 transition-colors">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="w-5 h-5 border-2 border-gray-900 rounded accent-amber-500"
          />
          <span className="text-sm font-bold text-gray-900">
            I have read and agree to the quiz integrity policy
          </span>
        </label>

        <div className="flex gap-4 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-amber-200 text-gray-900 font-bold border-2 border-gray-900 rounded-xl shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={!accepted}
            className="px-6 py-3 bg-amber-400 text-gray-900 font-bold border-2 border-gray-900 rounded-xl shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Quiz
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default QuizWarningModal;
