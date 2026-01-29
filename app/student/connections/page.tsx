/* eslint-disable @typescript-eslint/explicit-function-return-type */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Loading from "../../components/ui/Loading";

// This page redirects to the student dashboard with connections tab active
export default function ConnectionsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student?tab=connections");
  }, [router]);

  return <Loading />;
}
