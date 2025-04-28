"use client";

import { useTransition, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Loading from "@/components/Loading";

export default function RouteLoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    // Simulate a short delay for smoother UX
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 700); // Adjust this as needed

    return () => clearTimeout(timeout);
  }, [pathname]);

  return (
    <>
      {loading && <Loading />} {/* Show loading spinner */}
      {children}
    </>
  );
}
