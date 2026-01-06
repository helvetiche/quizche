"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthGuard from "../../components/auth/AuthGuard";
import DashboardLayout from "../../components/layout/DashboardLayout";
import QuizForm, { GeneratedQuizData } from "../../components/create/QuizForm";
import GenerateQuizButton from "../../components/create/GenerateQuizButton";
import Loading from "../../components/ui/Loading";

export default function CreateQuizPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialQuizData, setInitialQuizData] = useState<GeneratedQuizData | undefined>(undefined);

  const handleSaveQuiz = async (quiz: GeneratedQuizData) => {
    if (!idToken) return;

    try {
      const quizData = {
        title: quiz.title.trim(),
        description: quiz.description.trim(),
        isActive: true,
        questions: quiz.questions.map((q) => {
          const questionData: any = {
            question: q.question.trim(),
            type: q.type,
            answer: q.answer.trim(),
          };

          if (q.type === "multiple_choice" && q.choices && Array.isArray(q.choices)) {
            const filteredChoices = q.choices
              .filter((c) => c.trim().length > 0)
              .map((c) => c.trim());
            if (filteredChoices.length > 0) {
              questionData.choices = filteredChoices;
            }
          }

          return questionData;
        }),
      };

      const { apiPost } = await import("../../lib/api");
      const response = await apiPost("/api/quizzes", {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(quizData),
        idToken,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create quiz");
      }

      alert("Quiz created successfully!");
      router.push(`/teacher/quizzes/${data.id}`);
    } catch (error) {
      console.error("Error creating quiz:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to create quiz. Please try again."
      );
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
        } catch (error) {
          console.error("Error getting token:", error);
        }
      } else {
        setIdToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <AuthGuard requiredRole="teacher" onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - Create Quiz"
        userEmail={user?.email}
        userRole="teacher"
      >
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-light text-black">Create Quiz</h2>
            {idToken && (
              <GenerateQuizButton
                idToken={idToken}
                onSave={handleSaveQuiz}
                onEdit={(quiz) => {
                  setInitialQuizData(quiz);
                }}
              />
            )}
          </div>
          {idToken ? (
            <QuizForm idToken={idToken} initialData={initialQuizData} />
          ) : (
            <p className="text-lg text-black">Loading...</p>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
