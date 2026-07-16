"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MessageVolumePoint } from "@/lib/analytics";

export function MessageVolumeChart({ data }: { data: MessageVolumePoint[] }) {
  return (
    <Card className="bg-card/60 border-white/[0.06]">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Message Volume — Last 7 Days
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] pl-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              stroke="rgba(255,255,255,0.4)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#141414",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "rgba(255,255,255,0.7)" }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }} />
            <Line
              type="monotone"
              dataKey="user"
              name="User messages"
              stroke="#fd1d1d"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="assistant"
              name="AI replies"
              stroke="#833ab4"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
