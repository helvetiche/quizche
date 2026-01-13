"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Loading from "../../components/ui/Loading";

// /teacher/quiz without an ID redirects to the teacher dashboard
// The actual quiz pages are at /teacher/quiz/[id]
function QuizIndexRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/teacher?tab=quizzes");
  }, [router]);

  return <Loading />;
}

export default function QuizIndexPage() {
  return (
    <Suspense fallback={<Loading />}>
      <QuizIndexRedirect />
    </Suspense>
  );
}
