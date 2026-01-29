/* eslint-disable @typescript-eslint/explicit-function-return-type */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Loading from "../../components/ui/Loading";

export default function SectionsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new tab-based sections page
    router.replace("/teacher?tab=sections");
  }, [router]);

  return <Loading />;
}
