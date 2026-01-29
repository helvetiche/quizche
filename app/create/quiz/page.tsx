/* eslint-disable @typescript-eslint/explicit-function-return-type */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Loading from "../../components/ui/Loading";

// This page redirects to the teacher dashboard with the quiz create view
export default function CreateQuizRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/teacher?tab=quizzes&quizView=create");
  }, [router]);

  return <Loading />;
}
