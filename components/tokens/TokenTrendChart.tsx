"use client";

import { TrendDataPoint, DailyTokenUsage } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useMemo, useState } from "react";

interface TokenTrendChartProps {
  data?: TrendDataPoint[] | DailyTokenUsage[];
  isLoading?: boolean;
}

// 格式化数字（支持 K/M/万）
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万";
  }
  return num.toString();
}

// 格式化金额
function formatCost(num: number): string {
  if (num >= 1) {
    return "$" + num.toFixed(2);
  }
  return "$" + num.toFixed(4);
}

// 自定义 Tooltip
interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes("成本") ? formatCost(entry.value) : entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

type ChartView = "total" | "input_output" | "cost";

export function TokenTrendChart({ data, isLoading }: TokenTrendChartProps) {
  const [chartType, setChartType] = useState<ChartView>("total");

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map((item) => ({
      ...item,
      date: item.date.slice(5), // MM-DD 格式
    }));
  }, [data]);

  // 检查数据是否包含成本信息
  const hasCostData = data && data.length > 0 && "cost" in data[0];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token 消耗趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-gray-100 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token 消耗趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            暂无数据
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Token 消耗趋势</CardTitle>
        <div className="flex gap-2">
          <button
            onClick={() => setChartType("total")}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              chartType === "total"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            总量
          </button>
          <button
            onClick={() => setChartType("input_output")}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              chartType === "input_output"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            输入/输出
          </button>
          {hasCostData && (
            <button
              onClick={() => setChartType("cost")}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                chartType === "cost"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              成本
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {chartType === "total" ? (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#E5E7EB" }}
              />
              <YAxis
                tickFormatter={formatNumber}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#E5E7EB" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="totalTokens"
                name="总消耗"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
            </AreaChart>
          ) : chartType === "input_output" ? (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#E5E7EB" }}
              />
              <YAxis
                tickFormatter={formatNumber}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#E5E7EB" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="inputTokens"
                name="输入"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorInput)"
              />
              <Area
                type="monotone"
                dataKey="outputTokens"
                name="输出"
                stroke="#F59E0B"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorOutput)"
              />
            </AreaChart>
          ) : (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#E5E7EB" }}
              />
              <YAxis
                tickFormatter={formatCost}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#E5E7EB" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cost"
                name="成本"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCost)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
