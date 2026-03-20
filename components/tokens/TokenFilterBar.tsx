"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, X, Bot, ListFilter } from "lucide-react";
import { useState, useCallback } from "react";
import { ModelType } from "@/lib/api/types";

// 日期预设选项
type DatePreset = "today" | "thisWeek" | "thisMonth" | "thisQuarter";

function getDatePresetRange(preset: DatePreset): { start: string; end: string } {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  switch (preset) {
    case "today":
      return { start: todayStr, end: todayStr };
    case "thisWeek": {
      const dayOfWeek = today.getDay(); // 0=Sun
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMon);
      const monY = monday.getFullYear();
      const monM = String(monday.getMonth() + 1).padStart(2, "0");
      const monD = String(monday.getDate()).padStart(2, "0");
      return { start: `${monY}-${monM}-${monD}`, end: todayStr };
    }
    case "thisMonth":
      return { start: `${yyyy}-${mm}-01`, end: todayStr };
    case "thisQuarter": {
      const q = Math.floor(today.getMonth() / 3);
      const quarterStartMonth = q * 3;
      const qm = String(quarterStartMonth + 1).padStart(2, "0");
      return { start: `${yyyy}-${qm}-01`, end: todayStr };
    }
  }
}

const DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "今日" },
  { value: "thisWeek", label: "本周" },
  { value: "thisMonth", label: "本月" },
  { value: "thisQuarter", label: "本季度" },
];

interface TokenFilterBarProps {
  startDate?: string;
  endDate?: string;
  modelType?: ModelType | "all";
  status?: "pending" | "in_progress" | "completed" | "cancelled" | "all";
  onStartDateChange?: (value: string) => void;
  onEndDateChange?: (value: string) => void;
  onModelTypeChange?: (value: ModelType | "all") => void;
  onStatusChange?: (value: "pending" | "in_progress" | "completed" | "cancelled" | "all") => void;
  onClear?: () => void;
}

// 模型选项
const MODEL_OPTIONS: { value: ModelType | "all"; label: string }[] = [
  { value: "all", label: "全部模型" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "claude-3", label: "Claude-3" },
  { value: "claude-3.5", label: "Claude-3.5" },
  { value: "gemini", label: "Gemini" },
];

// 状态选项
const STATUS_OPTIONS: { value: "pending" | "in_progress" | "completed" | "cancelled" | "all"; label: string }[] = [
  { value: "all", label: "全部状态" },
  { value: "pending", label: "待处理" },
  { value: "in_progress", label: "进行中" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

export function TokenFilterBar({
  startDate,
  endDate,
  modelType = "all",
  status = "all",
  onStartDateChange,
  onEndDateChange,
  onModelTypeChange,
  onStatusChange,
  onClear,
}: TokenFilterBarProps) {
  const [localStartDate, setLocalStartDate] = useState(startDate || "");
  const [localEndDate, setLocalEndDate] = useState(endDate || "");
  const [localModelType, setLocalModelType] = useState<ModelType | "all">(modelType);
  const [localStatus, setLocalStatus] = useState<"pending" | "in_progress" | "completed" | "cancelled" | "all">(status);

  const hasFilters = localStartDate || localEndDate || localModelType !== "all" || localStatus !== "all";

  const handleStartDateChange = useCallback(
    (value: string) => {
      setLocalStartDate(value);
      onStartDateChange?.(value);
    },
    [onStartDateChange]
  );

  const handleEndDateChange = useCallback(
    (value: string) => {
      setLocalEndDate(value);
      onEndDateChange?.(value);
    },
    [onEndDateChange]
  );

  const handleModelTypeChange = useCallback(
    (value: ModelType | "all") => {
      setLocalModelType(value);
      onModelTypeChange?.(value);
    },
    [onModelTypeChange]
  );

  const handleStatusChange = useCallback(
    (value: "pending" | "in_progress" | "completed" | "cancelled" | "all") => {
      setLocalStatus(value);
      onStatusChange?.(value);
    },
    [onStatusChange]
  );

  const handleClear = useCallback(() => {
    setLocalStartDate("");
    setLocalEndDate("");
    setLocalModelType("all");
    setLocalStatus("all");
    onClear?.();
  }, [onClear]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 日期筛选 */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">日期：</span>
          </div>
          {/* 日期预设快捷按钮 */}
          <div className="flex items-center gap-1">
            {DATE_PRESET_OPTIONS.map((opt) => {
              const range = getDatePresetRange(opt.value);
              const isActive = localStartDate === range.start && localEndDate === range.end;
              return (
                <Button
                  key={opt.value}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    handleStartDateChange(range.start);
                    handleEndDateChange(range.end);
                  }}
                  className="text-xs h-7 px-2"
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={localStartDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-36"
              placeholder="开始日期"
            />
            <span className="text-gray-400">至</span>
            <Input
              type="date"
              value={localEndDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-36"
              placeholder="结束日期"
            />
          </div>

          <div className="w-px h-6 bg-gray-200"></div>

          {/* 模型类型筛选 */}
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">模型：</span>
            <select
              value={localModelType}
              onChange={(e) => handleModelTypeChange(e.target.value as ModelType | "all")}
              className="w-32 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-6 bg-gray-200"></div>

          {/* 状态筛选 */}
          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">状态：</span>
            <select
              value={localStatus}
              onChange={(e) => handleStatusChange(e.target.value as "pending" | "in_progress" | "completed" | "cancelled" | "all")}
              className="w-32 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="w-4 h-4 mr-1" />
              清除筛选
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
