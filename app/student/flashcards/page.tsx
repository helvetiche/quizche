/* eslint-disable @typescript-eslint/explicit-function-return-type */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Loading from "../../components/ui/Loading";

// This page redirects to the student dashboard with flashcards tab active
export default function StudentFlashcardsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student?tab=flashcards");
  }, [router]);

  return <Loading />;
}
