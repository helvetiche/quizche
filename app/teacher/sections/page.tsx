"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Loading from "../../components/ui/Loading";

// This page redirects to the teacher dashboard with sections tab active
export default function SectionsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/teacher?tab=sections");
  }, [router]);

  return <Loading />;
}
