import { TokenSummary } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Coins, FileText, Calculator, Clock } from "lucide-react";

interface TokenSummaryCardsProps {
  data?: TokenSummary;
  isLoading?: boolean;
}

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万";
  }
  return num.toLocaleString();
}

export function TokenSummaryCards({ data, isLoading }: TokenSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-24"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      title: "总消耗",
      value: formatNumber(data.totalTokens),
      icon: Coins,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "今日消耗",
      value: formatNumber(data.todayTokens),
      icon: Clock,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "本周消耗",
      value: formatNumber(data.weekTokens),
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "本月消耗",
      value: formatNumber(data.monthTokens),
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "完成任务",
      value: data.taskCount + " 个",
      icon: FileText,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "平均消耗",
      value: formatNumber(data.avgTokensPerTask),
      icon: Calculator,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{card.title}</p>
                <p className="text-xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
