import { DailyTokenUsage } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useMemo } from "react";

interface TokenDailyTableProps {
  data?: DailyTokenUsage[];
  isLoading?: boolean;
}

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万";
  }
  return num.toLocaleString();
}

export function TokenDailyTable({ data, isLoading }: TokenDailyTableProps) {
  // 计算趋势
  const trends = useMemo(() => {
    if (!data || data.length < 2) return [];
    
    const result: ("up" | "down" | "stable")[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        result.push("stable");
      } else {
        const diff = data[i].tokens - data[i - 1].tokens;
        if (diff > 1000) result.push("up");
        else if (diff < -1000) result.push("down");
        else result.push("stable");
      }
    }
    return result;
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>每日消耗明细</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>每日消耗明细</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">暂无数据</div>
        </CardContent>
      </Card>
    );
  }

  // 只显示最近7天
  const recentData = data.slice(-7).reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle>每日消耗明细 (近7天)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentData.map((item, index) => {
            const trendIndex = data.length - 1 - index;
            const trend = trends[trendIndex] || "stable";
            
            return (
              <div
                key={item.date}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">
                    {item.date.slice(5)}
                  </span>
                  <Badge variant="default">
                    {item.tasks} 个任务
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-gray-900">
                    {formatNumber(item.tokens)}
                  </span>
                  {trend === "up" && (
                    <TrendingUp className="w-4 h-4 text-red-500" />
                  )}
                  {trend === "down" && (
                    <TrendingDown className="w-4 h-4 text-green-500" />
                  )}
                  {trend === "stable" && (
                    <Minus className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
