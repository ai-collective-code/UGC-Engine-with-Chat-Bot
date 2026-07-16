import { MessageSquare, Clock, Timer } from "lucide-react";
import { MetricCard } from "@/components/analytics/metric-card";
import type { DashboardMetrics } from "@/lib/analytics";

export function MetricsCards({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard
        title="Total Interactions"
        value={metrics.totalInteractions.toLocaleString()}
        subtext="All-time user messages"
        icon={MessageSquare}
      />
      <MetricCard
        title="Last 24 Hours"
        value={metrics.last24hInteractions.toLocaleString()}
        subtext="User messages received"
        icon={Clock}
      />
      <MetricCard
        title="Avg. Response Time"
        value={formatResponseTime(metrics.avgResponseTimeSeconds)}
        subtext="User message → AI reply"
        icon={Timer}
      />
    </div>
  );
}

function formatResponseTime(seconds: number | null) {
  if (seconds === null) return "–";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${(seconds / 60).toFixed(1)}m`;
}
