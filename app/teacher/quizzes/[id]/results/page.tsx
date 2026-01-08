"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Loading from "../../../../components/ui/Loading";

// This page redirects to the teacher dashboard with the quiz results view
export default function QuizResultsRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params.id) {
      // Validate quizId format before redirecting
      const quizId = String(params.id);
      if (/^[a-zA-Z0-9_-]+$/.test(quizId)) {
        router.replace(`/teacher?tab=quizzes&quizView=results&quizId=${quizId}`);
      } else {
        router.replace("/teacher?tab=quizzes");
      }
    }
  }, [params.id, router]);

  return <Loading />;
}
