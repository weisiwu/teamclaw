import { DailyTokenUsage, TaskTokenUsage } from "@/lib/api/types";
import { tokenApi } from "@/lib/api/tokens";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, BarChart3, ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";

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
  // 展开的行
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  // 每个日期的任务列表缓存
  const [taskCache, setTaskCache] = useState<Record<string, TaskTokenUsage[]>>({});
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set());

  const toggleExpand = async (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
      setExpandedDates(newExpanded);
    } else {
      newExpanded.add(date);
      setExpandedDates(newExpanded);
      // 如果没有缓存，则加载
      if (!taskCache[date]) {
        setLoadingTasks((prev) => new Set(prev).add(date));
        try {
          const result = await tokenApi.getTaskList({
            startDate: date,
            endDate: date,
          });
          setTaskCache((prev) => ({ ...prev, [date]: result.data }));
        } catch (_e) {
          setTaskCache((prev) => ({ ...prev, [date]: [] }));
        } finally {
          setLoadingTasks((prev) => {
            const next = new Set(prev);
            next.delete(date);
            return next;
          });
        }
      }
    }
  };

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
          <EmptyState
            icon={BarChart3}
            title="暂无消耗数据"
            description="开始使用 AI 功能后，将在这里看到每日 Token 消耗明细"
          />
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
            const isExpanded = expandedDates.has(item.date);
            const tasks = taskCache[item.date] || [];
            const isLoadingTasks = loadingTasks.has(item.date);

            return (
              <div key={item.date} className="space-y-1">
                <div
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => toggleExpand(item.date)}
                >
                  <div className="flex items-center gap-3">
                    <button
                      className="p-0.5 rounded hover:bg-gray-200 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(item.date);
                      }}
                      aria-label={isExpanded ? "收起" : "展开"}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 transition-transform duration-200" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 transition-transform duration-200" />
                      )}
                    </button>
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

                {/* 展开的任务列表 */}
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: isExpanded ? "500px" : "0",
                    opacity: isExpanded ? 1 : 0,
                  }}
                >
                  <div className="ml-8 mr-2 mb-2 p-3 bg-white border border-gray-100 rounded-lg">
                    {isLoadingTasks ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="animate-pulse flex items-center gap-3">
                            <div className="h-3 bg-gray-200 rounded w-32"></div>
                            <div className="h-3 bg-gray-200 rounded w-20"></div>
                          </div>
                        ))}
                      </div>
                    ) : tasks.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-2">暂无任务数据</p>
                    ) : (
                      <div className="space-y-1.5">
                        {tasks.map((task) => (
                          <div
                            key={task.taskId}
                            className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-sm text-gray-700 truncate flex-1 mr-4">
                              {task.taskTitle}
                            </span>
                            <span className="text-sm font-medium text-gray-600 shrink-0">
                              {formatNumber(task.tokens)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
