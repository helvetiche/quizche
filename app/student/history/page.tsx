"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Loading from "../../components/ui/Loading";

// This page redirects to the student dashboard with history tab active
export default function QuizHistoryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student?tab=history");
  }, [router]);

  return <Loading />;
}
