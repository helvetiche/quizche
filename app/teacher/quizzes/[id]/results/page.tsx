"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Loading from "../../../../components/ui/Loading";

// This page redirects to the new /teacher/quiz/[id]?view=results route
export default function QuizResultsRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params.id) {
      const quizId = String(params.id);
      if (/^[a-zA-Z0-9_-]+$/.test(quizId)) {
        router.replace(`/teacher/quiz/${quizId}?view=results`);
      } else {
        router.replace("/teacher?tab=quizzes");
      }
    }
  }, [params.id, router]);

  return <Loading />;
}
