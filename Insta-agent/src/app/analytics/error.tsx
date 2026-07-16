"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Analytics dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-center max-w-sm">
        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <h2 className="text-sm font-medium text-white">Couldn&apos;t load analytics</h2>
        <p className="text-xs text-white/40">{error.message || "Something went wrong while fetching data from Supabase."}</p>
        <Button size="sm" onClick={reset} className="mt-2">
          Try again
        </Button>
      </div>
    </div>
  );
}
