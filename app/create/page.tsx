"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Loading from "../components/ui/Loading";

// This page redirects to the teacher dashboard with quizzes tab (create view)
// The create functionality is now part of the quizzes section
export default function CreateRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/teacher?tab=quizzes&quizView=create");
  }, [router]);

  return <Loading />;
}
