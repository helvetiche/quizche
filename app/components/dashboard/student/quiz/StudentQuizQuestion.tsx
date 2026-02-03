/* eslint-disable @typescript-eslint/explicit-function-return-type */
import Image from "next/image";
import type { Question } from "./types";

type StudentQuizQuestionProps = {
  question: Question;
  index: number;
  answer: string;
  onAnswerChange: (index: number, value: string) => void;
  disabled: boolean;
};

export default function StudentQuizQuestion({
  question,
  index,
  answer,
  onAnswerChange,
  disabled,
}: StudentQuizQuestionProps) {
  return (
    <div className="flex flex-col gap-4 p-6 border-2 border-black bg-white">
      <div className="flex items-start gap-3">
        <span className="text-lg font-light text-black min-w-[2rem]">
          {index + 1}.
        </span>
        <div className="flex-1 flex flex-col gap-4">
          <p className="text-lg font-light text-black">{question.question}</p>

          {question.imageUrl != null && question.imageUrl !== "" && (
            <div className="relative w-full max-w-2xl h-96 border-2 border-gray-300">
              <Image
                src={question.imageUrl}
                alt="Question image"
                fill
                className="object-contain"
              />
            </div>
          )}

          {question.type === "multiple_choice" && question.choices ? (
            <div className="flex flex-col gap-2">
              {question.choices.map((choice, choiceIndex) => (
                <label
                  key={choiceIndex}
                  className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name={`question-${index}`}
                    value={choice}
                    checked={answer === choice}
                    onChange={(e) => onAnswerChange(index, e.target.value)}
                    className="w-5 h-5 border-2 border-black"
                    disabled={disabled}
                  />
                  <span className="font-light text-black">{choice}</span>
                </label>
              ))}
            </div>
          ) : question.type === "true_or_false" ? (
            <div className="flex gap-4">
              <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50">
                <input
                  type="radio"
                  name={`question-${index}`}
                  value="true"
                  checked={answer === "true"}
                  onChange={(e) => onAnswerChange(index, e.target.value)}
                  className="w-5 h-5 border-2 border-black"
                  disabled={disabled}
                />
                <span className="font-light text-black">True</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50">
                <input
                  type="radio"
                  name={`question-${index}`}
                  value="false"
                  checked={answer === "false"}
                  onChange={(e) => onAnswerChange(index, e.target.value)}
                  className="w-5 h-5 border-2 border-black"
                  disabled={disabled}
                />
                <span className="font-light text-black">False</span>
              </label>
            </div>
          ) : (
            <textarea
              value={answer}
              onChange={(e) => onAnswerChange(index, e.target.value)}
              className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black resize-none"
              placeholder="Type your answer here..."
              rows={4}
              disabled={disabled}
            />
          )}
        </div>
      </div>
    </div>
  );
}
