import { getDashboardMetrics, getMessageVolume, getRecentActivity } from "@/lib/analytics";
import { MetricsCards } from "@/components/analytics/metrics-cards";
import { MessageVolumeChart } from "@/components/analytics/message-volume-chart";
import { RecentActivity } from "@/components/analytics/recent-activity";

// Without this the page is statically prerendered at build time and the
// metrics are frozen forever — analytics must always query live data.
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [metrics, volume, activity] = await Promise.all([
    getDashboardMetrics(),
    getMessageVolume(),
    getRecentActivity(10),
  ]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-6 sm:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Analytics</h1>
          <p className="text-sm text-white/40 mt-1">
            Instagram AI Agent — conversation activity overview
          </p>
        </div>

        <MetricsCards metrics={metrics} />
        <MessageVolumeChart data={volume} />
        <RecentActivity items={activity} />
      </div>
    </div>
  );
}
