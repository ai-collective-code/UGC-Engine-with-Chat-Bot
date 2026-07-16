import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] p-6 sm:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40 bg-white/[0.06]" />
          <Skeleton className="h-4 w-72 bg-white/[0.06]" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl bg-white/[0.06]" />
          ))}
        </div>

        <Skeleton className="h-[356px] rounded-xl bg-white/[0.06]" />
        <Skeleton className="h-[420px] rounded-xl bg-white/[0.06]" />
      </div>
    </div>
  );
}
