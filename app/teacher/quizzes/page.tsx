"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Loading from "../../components/ui/Loading";

// This page redirects to the teacher dashboard with quizzes tab active
// Preserves any quizView and quizId params for deep linking
export default function MyQuizzesRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Preserve quiz view params if present
    const quizView = searchParams.get("quizView");
    const quizId = searchParams.get("quizId");
    
    let redirectUrl = "/teacher?tab=quizzes";
    
    if (quizView) {
      redirectUrl += `&quizView=${quizView}`;
      if (quizId && /^[a-zA-Z0-9_-]+$/.test(quizId)) {
        redirectUrl += `&quizId=${quizId}`;
      }
    }
    
    router.replace(redirectUrl);
  }, [router, searchParams]);

  return <Loading />;
}
