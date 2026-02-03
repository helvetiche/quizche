/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { Difficulty } from "../types";

type ConfigureStepProps = {
  difficulty: Difficulty;
  setDifficulty: (difficulty: Difficulty) => void;
  numQuestions: number;
  setNumQuestions: (num: number) => void;
  additionalInstructions: string;
  setAdditionalInstructions: (instructions: string) => void;
  error: string | null;
};

export default function ConfigureStep({
  difficulty,
  setDifficulty,
  numQuestions,
  setNumQuestions,
  additionalInstructions,
  setAdditionalInstructions,
  error,
}: ConfigureStepProps) {
  const difficultyLevels = [
    {
      value: "easy",
      label: "Easy",
      desc: "Straightforward questions",
      icon: "sentiment_satisfied",
      color: "bg-green-100 border-green-400",
    },
    {
      value: "medium",
      label: "Medium",
      desc: "Requires understanding",
      icon: "sentiment_neutral",
      color: "bg-amber-100 border-amber-400",
    },
    {
      value: "hard",
      label: "Hard",
      desc: "Deep comprehension",
      icon: "sentiment_very_dissatisfied",
      color: "bg-red-100 border-red-400",
    },
  ] as const;

  const promptPresets = [
    {
      label: "Scenario-based",
      prompt: "Make the questions scenario-based with practical situations",
    },
    {
      label: "Real-life cases",
      prompt: "Use real-life cases and examples in the questions",
    },
    {
      label: "Philippine context",
      prompt: "Use examples and context relevant to the Philippines",
    },
    {
      label: "Critical thinking",
      prompt: "Focus on critical thinking and analysis questions",
    },
    {
      label: "Application-focused",
      prompt: "Emphasize application of concepts rather than memorization",
    },
    {
      label: "Case studies",
      prompt: "Include case study style questions",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-black text-gray-900 mb-2">
          Configure Your Quiz
        </h3>
        <p className="text-sm text-gray-600">
          Customize the difficulty and number of questions to match your needs.
        </p>
      </div>

      {/* Difficulty */}
      <div>
        <label className="text-sm font-black text-gray-900 mb-3 block">
          Difficulty Level
        </label>
        <div className="grid grid-cols-3 gap-3">
          {difficultyLevels.map((level) => (
            <button
              key={level.value}
              onClick={() => setDifficulty(level.value)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                difficulty === level.value
                  ? `${level.color} border-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)]`
                  : "bg-white border-gray-300 hover:border-gray-900"
              }`}
            >
              <span className="material-icons text-2xl mb-2">{level.icon}</span>
              <p className="font-bold text-gray-900">{level.label}</p>
              <p className="text-xs text-gray-600">{level.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Number of Questions */}
      <div>
        <label className="text-sm font-black text-gray-900 mb-2 block">
          Number of Questions
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={50}
            value={numQuestions}
            onChange={(e) => setNumQuestions(parseInt(e.target.value))}
            className="flex-1 h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="w-16 h-12 bg-white border-2 border-gray-900 rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
            <span className="text-xl font-black text-gray-900">
              {numQuestions}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Recommended: 10-20 questions for optimal results
        </p>
      </div>

      {/* Additional Instructions */}
      <div>
        <label className="text-sm font-black text-gray-900 mb-2 block">
          Additional Instructions{" "}
          <span className="text-gray-400 font-normal">(Optional)</span>
        </label>
        <textarea
          value={additionalInstructions}
          onChange={(e) => setAdditionalInstructions(e.target.value)}
          className="w-full px-4 py-3 bg-white border-2 border-gray-900 rounded-xl font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
          placeholder="e.g., Focus on Chapter 3, Include practical examples, Avoid theoretical questions..."
          rows={3}
        />
        {/* Prompt Presets */}
        <div className="flex flex-wrap gap-2 mt-3">
          {promptPresets.map((preset) => {
            const isSelected = additionalInstructions.includes(preset.prompt);
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setAdditionalInstructions(
                      additionalInstructions
                        .replace(preset.prompt, "")
                        .replace(/,\s*,/g, ",")
                        .replace(/^,\s*|,\s*$/g, "")
                        .trim()
                    );
                  } else {
                    setAdditionalInstructions(
                      additionalInstructions
                        ? `${additionalInstructions}, ${preset.prompt}`
                        : preset.prompt
                    );
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                  isSelected
                    ? "bg-amber-400 border-gray-900 text-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                    : "bg-white border-gray-300 text-gray-600 hover:border-gray-900 hover:bg-amber-50"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-amber-100 border-2 border-amber-400 rounded-xl p-4">
        <p className="text-gray-900 font-bold text-sm mb-1">Pro Tips</p>
        <p className="text-gray-700 text-xs leading-relaxed">
          Use specific instructions to help the AI focus on particular topics or
          chapters from your content. Starting with fewer questions allows you
          to assess quality before generating more. Medium difficulty typically
          works best for standard classroom assessments and provides a good
          balance between challenge and accessibility.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border-2 border-red-500 rounded-xl p-4 flex items-center gap-3">
          <span className="material-icons text-red-600">error</span>
          <p className="text-red-700 font-medium text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
