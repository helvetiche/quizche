/* eslint-disable @typescript-eslint/explicit-function-return-type */
"use client";

import { type GeneratedQuizData } from "./quiz-form/types";
import Modal from "@/components/Modal";
import UploadStep from "./pdf-upload/steps/UploadStep";
import ConfigureStep from "./pdf-upload/steps/ConfigureStep";
import GenerateStep from "./pdf-upload/steps/GenerateStep";
import PreviewStep from "./pdf-upload/steps/PreviewStep";
import { usePDFUpload } from "./pdf-upload/hooks/usePDFUpload";

type PDFUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quiz: GeneratedQuizData) => void;
  onEdit: (quiz: GeneratedQuizData) => void;
  idToken: string;
};

const PDFUploadModal = ({
  isOpen,
  onClose,
  onSave,
  onEdit,
  idToken,
}: PDFUploadModalProps) => {
  const {
    step,
    file,
    difficulty,
    setDifficulty,
    numQuestions,
    setNumQuestions,
    additionalInstructions,
    setAdditionalInstructions,
    loading,
    error,
    generatedQuiz,
    handleFileSelect,
    handleNext,
    handleBack,
    handleClose,
    handleSave,
    handleContinueEditing,
    handleRemoveFile,
  } = usePDFUpload({ onClose, onSave, onEdit, idToken });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="max-w-4xl w-full mx-4 h-[80vh] flex flex-col"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full h-full flex flex-col overflow-hidden">
        {/* Header with Steps */}
        <div className="px-6 py-3 bg-amber-100 border-b-2 border-gray-900">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div
                  className={`h-2 flex-1 rounded-full border border-gray-900 ${
                    s <= step ? "bg-amber-400" : "bg-white"
                  }`}
                />
                {s < 4 && <span className="text-gray-400 text-xs">→</span>}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span
              className={`text-[10px] font-bold ${
                step >= 1 ? "text-gray-900" : "text-gray-400"
              }`}
            >
              Upload
            </span>
            <span
              className={`text-[10px] font-bold ${
                step >= 2 ? "text-gray-900" : "text-gray-400"
              }`}
            >
              Configure
            </span>
            <span
              className={`text-[10px] font-bold ${
                step >= 3 ? "text-gray-900" : "text-gray-400"
              }`}
            >
              Generate
            </span>
            <span
              className={`text-[10px] font-bold ${
                step >= 4 ? "text-gray-900" : "text-gray-400"
              }`}
            >
              Preview
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <UploadStep
              file={file}
              onFileSelect={handleFileSelect}
              onRemoveFile={handleRemoveFile}
              error={error}
            />
          )}

          {step === 2 && (
            <ConfigureStep
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              numQuestions={numQuestions}
              setNumQuestions={setNumQuestions}
              additionalInstructions={additionalInstructions}
              setAdditionalInstructions={setAdditionalInstructions}
              error={error}
            />
          )}

          {step === 3 && <GenerateStep />}

          {step === 4 && <PreviewStep generatedQuiz={generatedQuiz} />}
        </div>

        {/* Footer */}
        <div className="bg-amber-100 px-6 py-4 border-t-2 border-gray-900 flex items-center justify-between">
          <div>
            {step > 1 && step < 4 && (
              <button
                onClick={() => void handleBack()}
                disabled={loading}
                className="px-5 py-2.5 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
              >
                <span className="material-icons text-sm">arrow_back</span> Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {step === 4 && generatedQuiz ? (
              <>
                <button
                  onClick={() => void handleContinueEditing()}
                  className="px-5 py-2.5 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                >
                  <span className="material-icons text-sm">edit</span> Edit
                  Questions
                </button>
                <button
                  onClick={() => void handleSave()}
                  className="px-5 py-2.5 bg-amber-400 text-gray-900 font-bold rounded-xl border-2 border-gray-900 hover:bg-amber-500 transition-colors flex items-center gap-2 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)]"
                >
                  <span className="material-icons text-sm">save</span> Save &
                  Publish
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => void handleClose()}
                  className="px-5 py-2.5 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleNext()}
                  disabled={loading || (step === 1 && !file)}
                  className="px-5 py-2.5 bg-amber-400 text-gray-900 font-bold rounded-xl border-2 border-gray-900 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)]"
                >
                  {step === 1
                    ? "Continue"
                    : step === 2
                      ? "Generate Quiz"
                      : "Processing..."}
                  <span className="material-icons text-sm">arrow_forward</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PDFUploadModal;
