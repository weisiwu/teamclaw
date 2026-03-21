"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TokenTrendChartInner = dynamic(
  () => import("./TokenTrendChartInner").then((mod) => mod.TokenTrendChart),
  {
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle>Token 趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
        </CardContent>
      </Card>
    ),
    ssr: false,
  }
);

interface TokenTrendChartProps {
  data?: import("@/lib/api/types").TrendDataPoint[] | import("@/lib/api/types").DailyTokenUsage[];
  isLoading?: boolean;
}

export function TokenTrendChart(props: TokenTrendChartProps) {
  return <TokenTrendChartInner {...props} />;
}
