"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Loading from "../../../components/ui/Loading";

// This page redirects to the new /teacher/quiz/[id] route
export default function QuizDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params.id) {
      const quizId = String(params.id);
      if (/^[a-zA-Z0-9_-]+$/.test(quizId)) {
        router.replace(`/teacher/quiz/${quizId}`);
      } else {
        router.replace("/teacher?tab=quizzes");
      }
    }
  }, [params.id, router]);

  return <Loading />;
}
