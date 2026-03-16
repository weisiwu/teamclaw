"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, X } from "lucide-react";
import { useState, useCallback } from "react";

interface TokenFilterBarProps {
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (value: string) => void;
  onEndDateChange?: (value: string) => void;
  onClear?: () => void;
}

export function TokenFilterBar({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
}: TokenFilterBarProps) {
  const [localStartDate, setLocalStartDate] = useState(startDate || "");
  const [localEndDate, setLocalEndDate] = useState(endDate || "");

  const hasFilters = localStartDate || localEndDate;

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

  const handleClear = useCallback(() => {
    setLocalStartDate("");
    setLocalEndDate("");
    onClear?.();
  }, [onClear]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">日期范围：</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={localStartDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-40"
              placeholder="开始日期"
            />
            <span className="text-gray-400">至</span>
            <Input
              type="date"
              value={localEndDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-40"
              placeholder="结束日期"
            />
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
