"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Loading from "../../components/ui/Loading";

// This page redirects to the student dashboard with quizzes tab active
export default function StudentQuizzesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student?tab=quizzes");
  }, [router]);

  return <Loading />;
}
