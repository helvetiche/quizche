/* eslint-disable @typescript-eslint/explicit-function-return-type */

type StudentQuizActionsProps = {
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
  disabled: boolean;
};

export default function StudentQuizActions({
  onCancel,
  onSubmit,
  submitting,
  disabled,
}: StudentQuizActionsProps) {
  return (
    <div className="flex gap-4 justify-end">
      <button
        onClick={onCancel}
        className="px-6 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={() => void onSubmit()}
        disabled={disabled}
        className="px-6 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {submitting && (
          <svg
            className="animate-spin h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {submitting ? "Submitting..." : "Submit Quiz"}
      </button>
    </div>
  );
}
