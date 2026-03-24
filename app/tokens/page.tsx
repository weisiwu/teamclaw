"use client";

import { useMemo, Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, CheckCircle2, XCircle } from "lucide-react";
import {
  TokenSummaryCards,
  TokenTrendChart,
  TokenDailyTable,
  TokenTaskTable,
  TokenFilterBar,
  TokenUsageByToken,
  TokenUsageByAgent,
  LLMCallLogTable,
} from "@/components/tokens";
import {
  useTokenSummary,
  useTokenDailyList,
  useTokenTaskList,
  useTokenTrend,
} from "@/hooks/useTokens";
import {
  useTokenUsageSummary,
  useAgentTokenUsage,
  useLLMCallLogs,
} from "@/hooks/useTokenUsage";
import { TokenUsageFilters } from "@/lib/api/types";

type Tab = "overview" | "byToken" | "byAgent" | "calls";

function Tabs({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "总览" },
    { key: "byToken", label: "按 Token" },
    { key: "byAgent", label: "按 Agent" },
    { key: "calls", label: "调用日志" },
  ];
  return (
    <div className="flex gap-1 border-b border-gray-200">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            active === t.key
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// Token 页面内容组件
function TokensContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Tab 状态
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // 从 URL 获取筛选参数
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const taskSearch = searchParams.get("taskSearch") || undefined;
  const taskPage = Number(searchParams.get("taskPage")) || 1;

  // 调用日志筛选
  const [callFilters, setCallFilters] = useState<TokenUsageFilters>({
    page: 1,
    pageSize: 20,
  });

  // 筛选参数
  const dateFilters = useMemo(
    () => ({ startDate, endDate }),
    [startDate, endDate]
  );

  const taskFilters = useMemo(
    () => ({
      search: taskSearch,
      page: taskPage,
      pageSize: 10,
    }),
    [taskSearch, taskPage]
  );

  // 使用 React Query 获取数据
  const { data: summaryData, isLoading: summaryLoading } = useTokenSummary();
  const { data: dailyData, isLoading: dailyLoading } = useTokenDailyList(dateFilters);
  const { data: taskData, isLoading: taskLoading } = useTokenTaskList(taskFilters);
  const { data: trendData, isLoading: trendLoading } = useTokenTrend(30);

  // 新增：用量统计 API
  const { data: tokenUsageData, isLoading: tokenUsageLoading } = useTokenUsageSummary();
  const [agentFilters, setAgentFilters] = useState<TokenUsageFilters>({});
  const { data: agentUsageData, isLoading: agentUsageLoading } = useAgentTokenUsage(agentFilters);
  const { data: llmCallsData, isLoading: llmCallsLoading } = useLLMCallLogs(callFilters);

  // 刷新数据
  const handleRefresh = () => {
    window.location.reload();
  };

  // Toast 通知
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

  useEffect(() => {
    if (toastVisible) {
      const timer = setTimeout(() => setToastVisible(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastVisible]);

  // 导出数据
  const handleExport = () => {
    const exportData = dailyData?.data;
    if (!exportData || exportData.length === 0) {
      showToast("暂无数据可导出", "error");
      return;
    }
    interface DailyRecord {
      date: string;
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      cost?: number;
    }
    const headers = ["日期", "输入Token", "输出Token", "总Token", "预估成本(元)"];
    const rows = (exportData as DailyRecord[]).map((item) => [
      item.date,
      item.inputTokens?.toLocaleString() || "0",
      item.outputTokens?.toLocaleString() || "0",
      item.totalTokens?.toLocaleString() || "0",
      item.cost?.toFixed(4) || "0.0000",
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `token-stats-${startDate || "all"}-${endDate || "all"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 构建新的 URL 参数
  const createQueryString = (
    params: Record<string, string | number | null>
  ) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === "" || value === undefined) {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });
    return newParams.toString();
  };

  // 日期筛选处理
  const handleStartDateChange = (value: string) => {
    const query = createQueryString({ startDate: value, taskPage: 1 });
    router.push(`${pathname}?${query}`);
  };

  const handleEndDateChange = (value: string) => {
    const query = createQueryString({ endDate: value, taskPage: 1 });
    router.push(`${pathname}?${query}`);
  };

  const handleClearFilters = () => {
    router.push(pathname);
  };

  // 任务搜索处理
  const handleTaskSearchChange = (value: string) => {
    const query = createQueryString({ taskSearch: value, taskPage: 1 });
    router.push(`${pathname}?${query}`);
  };

  // 任务分页处理
  const handleTaskPageChange = (newPage: number) => {
    const query = createQueryString({ taskPage: newPage });
    router.push(`${pathname}?${query}`);
  };

  const isLoading = summaryLoading || dailyLoading || trendLoading || taskLoading;

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Token 消费统计</h1>
          <p className="text-gray-500 mt-1">查看 Token 消耗明细与趋势</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={isLoading}>
            <Download className="w-4 h-4 mr-2" />
            导出CSV
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            刷新数据
          </Button>
        </div>
      </div>

      {/* Tab 导航 */}
      <Tabs active={activeTab} onChange={setActiveTab} />

      {/* Tab 内容 */}
      {activeTab === "overview" && (
        <>
          {/* Token 汇总卡片 */}
          <TokenSummaryCards data={summaryData?.data} isLoading={summaryLoading} />

          {/* 筛选栏 */}
          <TokenFilterBar
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            onClear={handleClearFilters}
          />

          {/* 图表区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TokenTrendChart data={trendData?.data} isLoading={trendLoading} />
            <TokenDailyTable data={dailyData?.data} isLoading={dailyLoading} />
          </div>

          {/* 任务 Token 列表 */}
          <TokenTaskTable
            data={taskData?.data}
            total={taskData?.total}
            page={taskData?.page}
            pageSize={taskData?.pageSize}
            totalPages={taskData?.totalPages}
            isLoading={taskLoading}
            onSearchChange={handleTaskSearchChange}
            onPageChange={handleTaskPageChange}
          />
        </>
      )}

      {activeTab === "byToken" && (
        <div className="space-y-4">
          <TokenUsageByToken
            data={tokenUsageData?.data}
            isLoading={tokenUsageLoading}
          />
        </div>
      )}

      {activeTab === "byAgent" && (
        <div className="space-y-4">
          <TokenUsageByAgent
            data={agentUsageData?.data}
            isLoading={agentUsageLoading}
            filters={agentFilters}
            onFiltersChange={setAgentFilters}
          />
        </div>
      )}

      {activeTab === "calls" && (
        <LLMCallLogTable
          data={llmCallsData?.data}
          total={llmCallsData?.total}
          page={llmCallsData?.page}
          pageSize={llmCallsData?.pageSize}
          totalPages={llmCallsData?.totalPages}
          isLoading={llmCallsLoading}
          filters={callFilters}
          onFiltersChange={setCallFilters}
          onPageChange={(p) => setCallFilters((f) => ({ ...f, page: p }))}
        />
      )}

      {/* Toast 通知 */}
      {toastVisible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm text-white ${
              toastType === "success" ? "bg-gray-900" : "bg-red-600"
            }`}
          >
            {toastType === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <XCircle className="w-4 h-4 text-white" />
            )}
            <span>{toastMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// 加载中占位组件
function TokensLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Token 消费统计</h1>
          <p className="text-gray-500 mt-1">查看 Token 消耗明细与趋势</p>
        </div>
        <Button variant="outline" disabled>
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          刷新数据
        </Button>
      </div>

      {/* 汇总卡片骨架 */}
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

      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse h-[300px] bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse h-[300px] bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse h-[200px] bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    </div>
  );
}

// 默认导出组件（带 Suspense）
export default function TokensPage() {
  return (
    <Suspense fallback={<TokensLoading />}>
      <TokensContent />
    </Suspense>
  );
}
