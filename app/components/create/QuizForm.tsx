"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadImageToImgbb } from "@/lib/imgbb";
import Image from "next/image";

type QuestionType = "multiple_choice" | "identification" | "true_or_false" | "essay" | "enumeration" | "reflection";

interface Question {
  id: string;
  question: string;
  type: QuestionType;
  choices: string[];
  answer: string;
  imageUrl?: string;
  imageFile?: File;
  imagePreview?: string;
}

const QUESTION_TYPES: { value: QuestionType; label: string; icon: string; color: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice", icon: "radio_button_checked", color: "bg-blue-400" },
  { value: "identification", label: "Identification", icon: "text_fields", color: "bg-purple-400" },
  { value: "true_or_false", label: "True / False", icon: "toggle_on", color: "bg-green-400" },
  { value: "essay", label: "Essay", icon: "article", color: "bg-orange-400" },
  { value: "enumeration", label: "Enumeration", icon: "format_list_numbered", color: "bg-pink-400" },
  { value: "reflection", label: "Reflection", icon: "psychology", color: "bg-cyan-400" },
];

export interface GeneratedQuizData {
  title: string;
  description: string;
  questions: Array<{ question: string; type: QuestionType; choices?: string[]; answer: string; imageUrl?: string; }>;
}

interface QuizFormProps {
  idToken: string;
  quizId?: string;
  draftId?: string;
  initialData?: GeneratedQuizData;
  title?: string;
  description?: string;
  onOpenSettings?: () => void;
  onOpenAIGenerate?: () => void;
  onDraftSaved?: (draftId: string) => void;
}

const QuizForm = ({ idToken, quizId, draftId: initialDraftId, initialData, title: propTitle, description: propDescription, onOpenSettings, onOpenAIGenerate, onDraftSaved }: QuizFormProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(!!quizId || !!initialDraftId);
  const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [isActive, setIsActive] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(
    initialData?.questions
      ? initialData.questions.map((q, index) => ({
          id: `${Date.now()}-${index}`,
          question: q.question,
          type: q.type,
          choices: q.type === "multiple_choice" ? (q.choices && q.choices.length > 0 ? q.choices : ["", "", "", ""]) : [],
          answer: q.answer,
          imageUrl: q.imageUrl,
        }))
      : [{ id: Date.now().toString(), question: "", type: "multiple_choice", choices: ["", "", "", ""], answer: "" }]
  );
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || "");
      setQuestions(initialData.questions.map((q, index) => ({
        id: `${Date.now()}-${index}`,
        question: q.question,
        type: q.type,
        choices: q.type === "multiple_choice" ? (q.choices && q.choices.length > 0 ? q.choices : ["", "", "", ""]) : [],
        answer: q.answer,
        imageUrl: q.imageUrl,
      })));
      setCurrentQuestionIndex(0);
      return;
    }
    const fetchQuizOrDraft = async () => {
      if ((!quizId && !initialDraftId) || !idToken) return;
      try {
        setLoadingQuiz(true);
        const { apiGet } = await import("../../lib/api");
        
        if (initialDraftId) {
          // Load draft
          const response = await apiGet(`/api/quizzes/drafts/${initialDraftId}`, { idToken });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Failed to fetch draft");
          const draft = data.draft;
          setTitle(draft.title || "");
          setDescription(draft.description || "");
          setDraftId(initialDraftId);
          const loadedQuestions = (draft.questions || []).map((q: any, index: number) => ({
            id: q.id || `${Date.now()}-${index}`,
            question: q.question || "",
            type: q.type || "multiple_choice",
            choices: q.choices || (q.type === "multiple_choice" ? ["", "", "", ""] : []),
            answer: q.answer || "",
            imageUrl: q.imageUrl,
          }));
          setQuestions(loadedQuestions.length > 0 ? loadedQuestions : [{ id: Date.now().toString(), question: "", type: "multiple_choice", choices: ["", "", "", ""], answer: "" }]);
          setCurrentQuestionIndex(0);
        } else if (quizId) {
          // Load existing quiz
          const response = await apiGet(`/api/quizzes/${quizId}`, { idToken });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Failed to fetch quiz");
          const quiz = data.quiz;
          setTitle(quiz.title);
          setDescription(quiz.description || "");
          setIsActive(quiz.isActive !== undefined ? quiz.isActive : true);
          const loadedQuestions = quiz.questions.map((q: any, index: number) => ({
            id: `${Date.now()}-${index}`,
            question: q.question,
            type: q.type,
            choices: q.choices || (q.type === "multiple_choice" ? ["", "", "", ""] : []),
            answer: q.answer,
            imageUrl: q.imageUrl,
          }));
          setQuestions(loadedQuestions.length > 0 ? loadedQuestions : [{ id: Date.now().toString(), question: "", type: "multiple_choice", choices: ["", "", "", ""], answer: "" }]);
          setCurrentQuestionIndex(0);
        }
      } catch (err) {
        console.error("Error fetching quiz/draft:", err);
        alert(err instanceof Error ? err.message : "Failed to load quiz/draft");
      } finally {
        setLoadingQuiz(false);
      }
    };
    fetchQuizOrDraft();
  }, [quizId, initialDraftId, idToken, initialData]);

  useEffect(() => {
    return () => { Object.values(imagePreviewUrls).forEach((url) => URL.revokeObjectURL(url)); };
  }, [imagePreviewUrls]);

  const handleAddQuestion = (type: QuestionType = "multiple_choice") => {
    const newQuestion = { id: Date.now().toString(), question: "", type, choices: type === "multiple_choice" ? ["", "", "", ""] : [], answer: "" };
    setQuestions([...questions, newQuestion]);
    setCurrentQuestionIndex(questions.length);
  };

  const handleDuplicateQuestion = () => {
    if (!currentQuestion) return;
    const duplicated = { ...currentQuestion, id: Date.now().toString() };
    const newQuestions = [...questions];
    newQuestions.splice(currentQuestionIndex + 1, 0, duplicated);
    setQuestions(newQuestions);
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  const handleImageSelect = (questionId: string, file: File) => {
    if (!file.type.startsWith("image/")) { alert("Please select an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { alert("Image size must be less than 10MB"); return; }
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrls((prev) => ({ ...prev, [questionId]: previewUrl }));
    setQuestions(questions.map((q) => (q.id === questionId ? { ...q, imageFile: file, imagePreview: previewUrl } : q)));
  };

  const handleRemoveImage = (questionId: string) => {
    const previewUrl = imagePreviewUrls[questionId];
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setImagePreviewUrls((prev) => { const newUrls = { ...prev }; delete newUrls[questionId]; return newUrls; }); }
    setQuestions(questions.map((q) => (q.id === questionId ? { ...q, imageFile: undefined, imagePreview: undefined, imageUrl: undefined } : q)));
  };

  const handleRemoveQuestion = (id: string) => {
    if (questions.length === 1) { alert("You must have at least one question"); return; }
    const questionIndex = questions.findIndex((q) => q.id === id);
    const newQuestions = questions.filter((q) => q.id !== id);
    setQuestions(newQuestions);
    if (currentQuestionIndex >= newQuestions.length) setCurrentQuestionIndex(newQuestions.length - 1);
    else if (questionIndex < currentQuestionIndex) setCurrentQuestionIndex(currentQuestionIndex - 1);
  };

  const handleQuestionChange = (id: string, field: keyof Question, value: string | QuestionType | string[]) => {
    setQuestions(questions.map((q) => {
      if (q.id === id) {
        const updated = { ...q, [field]: value };
        if (field === "type") {
          const newType = value as QuestionType;
          updated.choices = newType === "multiple_choice" ? (updated.choices.length > 0 ? updated.choices : ["", "", "", ""]) : [];
          if (newType === "true_or_false") updated.answer = "";
        }
        return updated;
      }
      return q;
    }));
  };

  const handleChoiceChange = (questionId: string, choiceIndex: number, value: string) => {
    setQuestions(questions.map((q) => {
      if (q.id === questionId) { const newChoices = [...q.choices]; newChoices[choiceIndex] = value; return { ...q, choices: newChoices }; }
      return q;
    }));
  };

  const handleAddChoice = (questionId: string) => { setQuestions(questions.map((q) => (q.id === questionId ? { ...q, choices: [...q.choices, ""] } : q))); };

  const handleRemoveChoice = (questionId: string, choiceIndex: number) => {
    setQuestions(questions.map((q) => {
      if (q.id === questionId) {
        if (q.choices.length <= 2) { alert("Multiple choice questions must have at least 2 choices"); return q; }
        return { ...q, choices: q.choices.filter((_, i) => i !== choiceIndex) };
      }
      return q;
    }));
  };

  const getDuplicateChoices = (questionId: string): number[] => {
    const question = questions.find((q) => q.id === questionId);
    if (!question || question.type !== "multiple_choice") return [];
    const duplicates: number[] = [];
    const choiceMap = new Map<string, number[]>();
    question.choices.forEach((choice, index) => {
      const trimmed = choice.trim().toLowerCase();
      if (trimmed.length > 0) { if (!choiceMap.has(trimmed)) choiceMap.set(trimmed, []); choiceMap.get(trimmed)!.push(index); }
    });
    choiceMap.forEach((indices) => { if (indices.length > 1) duplicates.push(...indices); });
    return duplicates;
  };

  const hasDuplicateChoices = (questionId: string): boolean => getDuplicateChoices(questionId).length > 0;

  const validateForm = (): boolean => {
    const displayTitle = propTitle || title;
    if (!displayTitle.trim()) { alert("Please enter a quiz title in Quiz Settings"); return false; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) { alert(`Please enter a question for question ${i + 1}`); setCurrentQuestionIndex(i); return false; }
      if (q.type === "multiple_choice") {
        const validChoices = q.choices.filter((c) => c.trim().length > 0);
        if (validChoices.length < 2) { alert(`Question ${i + 1}: Multiple choice questions must have at least 2 choices`); setCurrentQuestionIndex(i); return false; }
        if (hasDuplicateChoices(q.id)) { alert(`Question ${i + 1}: Duplicate choices are not allowed.`); setCurrentQuestionIndex(i); return false; }
        if (!q.answer.trim()) { alert(`Question ${i + 1}: Please enter the correct answer`); setCurrentQuestionIndex(i); return false; }
        if (!validChoices.includes(q.answer.trim())) { alert(`Question ${i + 1}: The answer must be one of the choices`); setCurrentQuestionIndex(i); return false; }
      } else if (q.type === "true_or_false") {
        if (q.answer !== "true" && q.answer !== "false") { alert(`Question ${i + 1}: Please select true or false as the answer`); setCurrentQuestionIndex(i); return false; }
      } else {
        if (!q.answer.trim()) { alert(`Question ${i + 1}: Please enter the answer`); setCurrentQuestionIndex(i); return false; }
      }
    }
    return true;
  };

  const handleSaveAsDraft = async () => {
    if (!idToken) { alert("Authentication required. Please refresh the page."); return; }
    setSavingDraft(true);
    try {
      const displayTitle = propTitle || title;
      const displayDescription = propDescription || description;
      const draftData = {
        draftId: draftId,
        title: displayTitle.trim(),
        description: displayDescription.trim(),
        questions: questions.map((q) => ({
          id: q.id,
          question: q.question.trim(),
          type: q.type,
          choices: q.type === "multiple_choice" ? q.choices.filter((c) => c.trim().length > 0).map((c) => c.trim()) : [],
          answer: q.answer.trim(),
          imageUrl: q.imageUrl,
        })),
      };
      const { apiPost } = await import("../../lib/api");
      const response = await apiPost("/api/quizzes/drafts", {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftData),
        idToken,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save draft");
      if (!draftId && data.id) {
        setDraftId(data.id);
        onDraftSaved?.(data.id);
      }
      alert("Draft saved successfully!");
    } catch (error) {
      console.error("Error saving draft:", error);
      alert(error instanceof Error ? error.message : "Failed to save draft. Please try again.");
    } finally { setSavingDraft(false); }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;
    if (!idToken) { alert("Authentication required. Please refresh the page."); return; }
    setLoading(true);
    try {
      const questionsWithImages = await Promise.all(questions.map(async (q) => {
        let imageUrl = q.imageUrl;
        if (q.imageFile) {
          try {
            imageUrl = await uploadImageToImgbb(q.imageFile, idToken);
            if (q.imagePreview) { URL.revokeObjectURL(q.imagePreview); setImagePreviewUrls((prev) => { const newUrls = { ...prev }; delete newUrls[q.id]; return newUrls; }); }
          } catch (error) { throw new Error(`Failed to upload image for question. ${error instanceof Error ? error.message : "Please try again."}`); }
        }
        return { question: q.question.trim(), type: q.type, choices: q.type === "multiple_choice" ? q.choices.filter((c) => c.trim().length > 0).map((c) => c.trim()) : undefined, answer: q.answer.trim(), imageUrl };
      }));
      const displayTitle = propTitle || title;
      const displayDescription = propDescription || description;
      const quizData = { title: displayTitle.trim(), description: displayDescription.trim(), isActive, questions: questionsWithImages };
      const { apiPost, apiPut } = await import("../../lib/api");
      const url = quizId ? `/api/quizzes/${quizId}` : "/api/quizzes";
      const response = quizId
        ? await apiPut(url, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(quizData), idToken })
        : await apiPost(url, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(quizData), idToken });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to ${quizId ? "update" : "create"} quiz`);
      alert(`Quiz ${quizId ? "updated" : "created"} successfully!`);
      router.push(quizId ? `/teacher/quizzes/${quizId}` : "/teacher/quizzes");
    } catch (error) {
      console.error(`Error ${quizId ? "updating" : "creating"} quiz:`, error);
      alert(error instanceof Error ? error.message : `Failed to ${quizId ? "update" : "create"} quiz. Please try again.`);
    } finally { setLoading(false); }
  };

  const getQuestionTypeInfo = (type: QuestionType) => QUESTION_TYPES.find((t) => t.value === type) || QUESTION_TYPES[0];

  if (loadingQuiz) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-bold text-white">Loading quiz...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* LEFT SIDEBAR - Tools */}
      <div className={`flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-200 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>
        <div className="flex items-center justify-between p-3 border-b border-gray-800">
          {!sidebarCollapsed && <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">Tools</span>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors ml-auto">
            <span className="material-icons-outlined text-gray-400 text-sm">{sidebarCollapsed ? 'chevron_right' : 'chevron_left'}</span>
          </button>
        </div>

        {/* Question Types */}
        <div className="p-2 border-b border-gray-800">
          {!sidebarCollapsed && <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2 px-2">Add Question</p>}
          <div className="flex flex-col gap-1">
            {QUESTION_TYPES.map((type) => (
              <button key={type.value} onClick={() => handleAddQuestion(type.value)} className={`group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`} title={type.label}>
                <div className={`w-7 h-7 ${type.color} rounded-md flex items-center justify-center flex-shrink-0`}>
                  <span className="material-icons-outlined text-gray-900 text-sm">{type.icon}</span>
                </div>
                {!sidebarCollapsed && <span className="text-gray-400 font-medium text-xs group-hover:text-white transition-colors truncate">{type.label}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="p-2 border-b border-gray-800">
          {!sidebarCollapsed && <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2 px-2">Actions</p>}
          <div className="flex flex-col gap-1">
            {onOpenAIGenerate && (
              <button onClick={onOpenAIGenerate} className={`group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`} title="AI Generate">
                <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="material-icons-outlined text-white text-sm">auto_awesome</span>
                </div>
                {!sidebarCollapsed && <span className="text-gray-400 font-medium text-xs group-hover:text-white transition-colors">AI Generate</span>}
              </button>
            )}
            {onOpenSettings && (
              <button onClick={onOpenSettings} className={`group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`} title="Settings">
                <div className="w-7 h-7 bg-amber-400 rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="material-icons-outlined text-gray-900 text-sm">settings</span>
                </div>
                {!sidebarCollapsed && <span className="text-gray-400 font-medium text-xs group-hover:text-white transition-colors">Settings</span>}
              </button>
            )}
            <button onClick={handleDuplicateQuestion} className={`group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`} title="Duplicate">
              <div className="w-7 h-7 bg-violet-400 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="material-icons-outlined text-gray-900 text-sm">content_copy</span>
              </div>
              {!sidebarCollapsed && <span className="text-gray-400 font-medium text-xs group-hover:text-white transition-colors">Duplicate</span>}
            </button>
            {questions.length > 1 && (
              <button onClick={() => handleRemoveQuestion(currentQuestion?.id || '')} className={`group flex items-center gap-2 p-2 rounded-lg hover:bg-red-900/30 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`} title="Delete">
                <div className="w-7 h-7 bg-red-500 rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="material-icons-outlined text-white text-sm">delete</span>
                </div>
                {!sidebarCollapsed && <span className="text-gray-400 font-medium text-xs group-hover:text-red-400 transition-colors">Delete</span>}
              </button>
            )}
          </div>
        </div>

        {/* Publish Button */}
        <div className="mt-auto p-3 flex flex-col gap-2">
          <button onClick={handleSaveAsDraft} disabled={savingDraft || loading} className={`w-full flex items-center justify-center gap-2 p-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600`}>
            {savingDraft ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span className="material-icons-outlined text-sm">save_alt</span>}
            {!sidebarCollapsed && <span className="text-xs">{savingDraft ? 'Saving...' : 'Save Draft'}</span>}
          </button>
          <button onClick={() => handleSubmit()} disabled={loading || savingDraft} className={`w-full flex items-center justify-center gap-2 p-3 bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed`}>
            {loading ? <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div> : <span className="material-icons-outlined">{quizId ? 'save' : 'publish'}</span>}
            {!sidebarCollapsed && <span className="text-sm">{loading ? 'Saving...' : (quizId ? 'Save' : 'Publish')}</span>}
          </button>
        </div>
      </div>

      {/* MAIN CANVAS - Question Editor */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
        {renderQuestionEditor()}
      </div>
    </div>
  );

  function renderQuestionEditor() {
    if (!currentQuestion) return null;
    const duplicateIndices = getDuplicateChoices(currentQuestion.id);
    const typeInfo = getQuestionTypeInfo(currentQuestion.type);

    return (
      <>
        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {/* Question Card */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Card Header */}
              <div className={`${typeInfo.color} px-6 py-4 flex items-center justify-between`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <span className="text-2xl font-black text-gray-900">{currentQuestionIndex + 1}</span>
                  </div>
                  <div>
                    <p className="text-gray-900 font-bold text-lg">{typeInfo.label}</p>
                    <p className="text-gray-900/60 text-sm">Question {currentQuestionIndex + 1} of {questions.length}</p>
                  </div>
                </div>
                <select value={currentQuestion.type} onChange={(e) => handleQuestionChange(currentQuestion.id, "type", e.target.value as QuestionType)} className="px-4 py-2 bg-white/20 backdrop-blur border-2 border-gray-900/20 rounded-xl font-bold text-gray-900 text-sm cursor-pointer focus:outline-none">
                  {QUESTION_TYPES.map((type) => (<option key={type.value} value={type.value}>{type.label}</option>))}
                </select>
              </div>

              {/* Card Body */}
              <div className="p-6 flex flex-col gap-6">
                {/* Question Text */}
                <div>
                  <label className="text-sm font-bold text-gray-600 mb-2 block">Question <span className="text-red-500">*</span></label>
                  <textarea value={currentQuestion.question} onChange={(e) => handleQuestionChange(currentQuestion.id, "question", e.target.value)} className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 font-medium text-lg placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:bg-white resize-none transition-all" placeholder="Type your question here..." rows={3} />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="text-sm font-bold text-gray-600 mb-2 block">Image (Optional)</label>
                  {currentQuestion.imagePreview || currentQuestion.imageUrl ? (
                    <div className="flex items-start gap-4">
                      <div className="relative w-48 h-32 border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-100">
                        <Image src={currentQuestion.imagePreview || currentQuestion.imageUrl || ""} alt="Question image" fill className="object-contain" unoptimized={!!currentQuestion.imagePreview} />
                      </div>
                      <button type="button" onClick={() => handleRemoveImage(currentQuestion.id)} className="px-4 py-2 bg-red-100 text-red-600 font-bold text-sm rounded-lg hover:bg-red-200 transition-colors">Remove</button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-gray-900 hover:bg-gray-100 transition-all">
                      <span className="material-icons-outlined text-gray-400 text-3xl">cloud_upload</span>
                      <span className="text-sm font-medium text-gray-500">Click to upload</span>
                      <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageSelect(currentQuestion.id, file); e.target.value = ""; }} className="hidden" />
                    </label>
                  )}
                </div>

                {/* Answer Section based on type */}
                {currentQuestion.type === "multiple_choice" && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-bold text-gray-600">Choices <span className="text-red-500">*</span></label>
                      <button type="button" onClick={() => handleAddChoice(currentQuestion.id)} className="px-3 py-1.5 bg-blue-100 text-blue-600 font-bold text-xs rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1">
                        <span className="material-icons-outlined text-sm">add</span> Add
                      </button>
                    </div>
                    <div className="flex flex-col gap-3">
                      {currentQuestion.choices.map((choice, choiceIndex) => {
                        const isDuplicate = duplicateIndices.includes(choiceIndex);
                        const isCorrect = currentQuestion.answer.trim() === choice.trim() && choice.trim().length > 0;
                        return (
                          <div key={choiceIndex} className="flex items-center gap-3">
                            <button type="button" onClick={() => choice.trim() && handleQuestionChange(currentQuestion.id, "answer", choice.trim())} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isCorrect ? "bg-green-500 border-green-600 text-white" : "bg-gray-100 border-gray-300 hover:border-green-500 hover:bg-green-50"}`}>
                              {isCorrect && <span className="material-icons-outlined">check</span>}
                            </button>
                            <input type="text" value={choice} onChange={(e) => handleChoiceChange(currentQuestion.id, choiceIndex, e.target.value)} className={`flex-1 px-4 py-3 bg-gray-50 border-2 rounded-xl font-medium placeholder:text-gray-400 focus:outline-none focus:bg-white transition-all ${isDuplicate ? "border-red-500" : isCorrect ? "border-green-500 bg-green-50" : "border-gray-200 focus:border-gray-900"}`} placeholder={`Choice ${choiceIndex + 1}`} />
                            {currentQuestion.choices.length > 2 && (
                              <button type="button" onClick={() => handleRemoveChoice(currentQuestion.id, choiceIndex)} className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors">
                                <span className="material-icons-outlined">close</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {hasDuplicateChoices(currentQuestion.id) && <p className="text-sm text-red-500 mt-2 flex items-center gap-1"><span className="material-icons-outlined text-sm">warning</span> Duplicate choices detected</p>}
                    <p className="text-xs text-gray-500 mt-2">Click the circle to mark the correct answer</p>
                  </div>
                )}

                {currentQuestion.type === "true_or_false" && (
                  <div>
                    <label className="text-sm font-bold text-gray-600 mb-3 block">Correct Answer <span className="text-red-500">*</span></label>
                    <div className="flex gap-4">
                      <button type="button" onClick={() => handleQuestionChange(currentQuestion.id, "answer", "true")} className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg transition-all ${currentQuestion.answer === "true" ? "bg-green-500 border-green-600 text-white" : "bg-gray-50 border-gray-200 text-gray-700 hover:border-green-500"}`}>
                        <span className="flex items-center justify-center gap-2"><span className="material-icons-outlined">check</span> True</span>
                      </button>
                      <button type="button" onClick={() => handleQuestionChange(currentQuestion.id, "answer", "false")} className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg transition-all ${currentQuestion.answer === "false" ? "bg-red-500 border-red-600 text-white" : "bg-gray-50 border-gray-200 text-gray-700 hover:border-red-500"}`}>
                        <span className="flex items-center justify-center gap-2"><span className="material-icons-outlined">close</span> False</span>
                      </button>
                    </div>
                  </div>
                )}

                {(currentQuestion.type === "identification" || currentQuestion.type === "enumeration" || currentQuestion.type === "essay" || currentQuestion.type === "reflection") && (
                  <div>
                    <label className="text-sm font-bold text-gray-600 mb-2 block">
                      {currentQuestion.type === "enumeration" ? "Answers (comma-separated)" : currentQuestion.type === "essay" || currentQuestion.type === "reflection" ? "Sample Answer / Rubric" : "Correct Answer"} <span className="text-red-500">*</span>
                    </label>
                    <textarea value={currentQuestion.answer} onChange={(e) => handleQuestionChange(currentQuestion.id, "answer", e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl font-medium placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:bg-white resize-none transition-all" placeholder={currentQuestion.type === "enumeration" ? "Answer 1, Answer 2, Answer 3..." : currentQuestion.type === "essay" || currentQuestion.type === "reflection" ? "Enter sample answer or grading rubric..." : "Enter the correct answer..."} rows={currentQuestion.type === "essay" || currentQuestion.type === "reflection" ? 4 : 2} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM PAGINATION */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-t border-gray-800">
          <button type="button" onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))} disabled={currentQuestionIndex === 0} className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <span className="material-icons-outlined text-white">chevron_left</span>
          </button>

          <div className="flex-1 flex items-center gap-2 overflow-x-auto py-1 px-1">
            {questions.map((q, index) => {
              const typeInfo = getQuestionTypeInfo(q.type);
              const isActive = currentQuestionIndex === index;
              const hasContent = q.question.trim().length > 0;
              return (
                <button key={q.id} type="button" onClick={() => setCurrentQuestionIndex(index)} className={`flex-shrink-0 w-14 h-11 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${isActive ? `${typeInfo.color} border-white shadow-lg` : hasContent ? "bg-gray-800 border-gray-700 hover:border-gray-500" : "bg-gray-800/50 border-gray-700 border-dashed hover:border-gray-500"}`}>
                  <span className={`text-xs font-bold ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>{index + 1}</span>
                  <span className={`material-icons-outlined text-[10px] ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>{typeInfo.icon}</span>
                </button>
              );
            })}
            <button type="button" onClick={() => handleAddQuestion()} className="flex-shrink-0 w-11 h-11 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center hover:border-amber-400 hover:bg-gray-800 transition-all group">
              <span className="material-icons-outlined text-gray-600 group-hover:text-amber-400">add</span>
            </button>
          </div>

          <button type="button" onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))} disabled={currentQuestionIndex === questions.length - 1} className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <span className="material-icons-outlined text-white">chevron_right</span>
          </button>

          <div className="flex items-center gap-1 px-3 py-2 bg-gray-800 rounded-lg">
            <span className="text-amber-400 font-bold">{currentQuestionIndex + 1}</span>
            <span className="text-gray-600">/</span>
            <span className="text-gray-400">{questions.length}</span>
          </div>
        </div>
      </>
    );
  }
};

export default QuizForm;
