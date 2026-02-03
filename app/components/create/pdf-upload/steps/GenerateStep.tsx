/* eslint-disable @typescript-eslint/explicit-function-return-type */

export default function GenerateStep() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-12 h-12 border-4 border-amber-400 border-t-amber-50 rounded-full animate-spin mb-6" />
      <h3 className="text-xl font-black text-gray-900 mb-2">
        AI is Working Its Magic
      </h3>
      <p className="text-gray-600 text-center max-w-md mb-6">
        Analyzing your PDF and generating high-quality quiz questions. This
        usually takes 30-60 seconds.
      </p>
      <div className="bg-amber-100 border-2 border-amber-300 rounded-xl p-4 max-w-md">
        <p className="text-gray-700 text-xs text-center">
          Our AI analyzes your document content and context to generate
          meaningful questions that effectively test comprehension and
          understanding.
        </p>
      </div>
    </div>
  );
}
