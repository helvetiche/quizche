/* eslint-disable @typescript-eslint/explicit-function-return-type */
 
import { type GeneratedQuizData } from "../../quiz-form/types";

type PreviewStepProps = {
  generatedQuiz: GeneratedQuizData | null;
};

export default function PreviewStep({ generatedQuiz }: PreviewStepProps) {
  if (!generatedQuiz) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Quiz Details */}
      <div className="bg-amber-100 border-2 border-amber-400 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-gray-900">
            {generatedQuiz.title}
          </h3>
          <span className="px-3 py-1 bg-amber-400 border border-gray-900 rounded-full text-xs font-bold text-gray-900">
            {generatedQuiz.questions.length} Questions
          </span>
        </div>
        {generatedQuiz.description && (
          <p className="text-gray-700 text-sm leading-relaxed border-t border-amber-300 pt-4">
            {generatedQuiz.description}
          </p>
        )}
      </div>

      {/* Questions Preview */}
      <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-2">
        {generatedQuiz.questions.map((question, index) => (
          <div
            key={index}
            className="bg-white border-2 border-gray-300 rounded-xl p-4 hover:border-gray-900 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center border border-gray-900 flex-shrink-0">
                <span className="text-sm font-black text-gray-900">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-medium text-sm line-clamp-2">
                  {question.question}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium capitalize">
                    {question.type.replace("_", " ")}
                  </span>
                  <span className="text-xs text-green-600 font-medium">
                    ✓ {question.answer.substring(0, 30)}
                    {question.answer.length > 30 ? "..." : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-100 border-2 border-amber-400 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="material-icons text-amber-600">warning</span>
          <div>
            <p className="text-gray-900 font-bold text-sm mb-1">
              Review Recommended
            </p>
            <p className="text-gray-700 text-xs">
              AI-generated content may contain inaccuracies. Please review all
              questions and answers before publishing your quiz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
