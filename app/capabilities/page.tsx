"use client";

import { useState, useMemo, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Info, 
  ListTodo, 
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  Search,
  ArrowUpDown,
  Eye,
  CheckSquare,
  Square
} from "lucide-react";
import { useCapabilityList, useUpdateCapability } from "@/hooks/useCapabilities";
import { Capability } from "@/lib/api/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";

// 加载状态组件
function CapabilitiesLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">辅助能力管理</h1>
          <p className="text-gray-500 mt-1">配置和管理辅助能力开关</p>
        </div>
      </div>
      <Card>
        <CardContent className="py-12 text-center text-gray-500 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          加载中...
        </CardContent>
      </Card>
    </div>
  );
}

// 图标映射
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Info,
  ListTodo,
  Download,
};

// 能力分组映射
const categoryMap: Record<string, string> = {
  "查看项目文档库": "信息查看",
  "查看项目详情": "信息查看",
  "查看任务列表": "信息查看",
  "下载文件": "文件操作",
};

// 能力详情弹窗
function CapabilityDetailDialog({
  capability,
  open,
  onClose
}: {
  capability: Capability | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!capability) return null;
  
  const Icon = iconMap[capability.icon] || Settings;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent title={capability.name} onClose={onClose}>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center mb-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
              capability.enabled ? "bg-blue-50" : "bg-gray-100"
            }`}>
              <Icon className={`w-8 h-8 ${capability.enabled ? "text-blue-600" : "text-gray-400"}`} />
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">能力ID</span>
              <span className="font-mono text-xs break-all max-w-[200px]">{capability.id}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">描述</span>
              <span className="text-right max-w-[200px]">{capability.description}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">图标</span>
              <span>{capability.icon}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">状态</span>
              <Badge variant={capability.enabled ? "success" : "default"}>
                {capability.enabled ? "已启用" : "已禁用"}
              </Badge>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">创建时间</span>
              <span>{capability.createdAt}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">更新时间</span>
              <span>{capability.updatedAt}</span>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 能力卡片组件
function CapabilityCard({
  capability,
  onToggle,
  isUpdating,
  selected,
  onSelect
}: {
  capability: Capability;
  onToggle: (id: string, enabled: boolean) => void;
  isUpdating: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = iconMap[capability.icon] || Settings;
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* 复选框 */}
              <button
                onClick={() => onSelect(capability.id)}
                className="text-blue-600 hover:text-blue-700"
              >
                {selected ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {/* 图标 */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                capability.enabled ? "bg-blue-50" : "bg-gray-100"
              }`}>
                <Icon className={`w-5 h-5 ${capability.enabled ? "text-blue-600" : "text-gray-400"}`} />
              </div>
              
              {/* 信息 */}
              <div>
                <h3 className="font-semibold text-gray-900">{capability.name}</h3>
                <p className="text-sm text-gray-500">{capability.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                  更新时间：{capability.updatedAt}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* 详情按钮 */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDetail(true)}
                title="查看详情"
              >
                <Eye className="w-4 h-4" />
              </Button>
              
              <Badge variant={capability.enabled ? "success" : "default"}>
                {capability.enabled ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    已启用
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    已禁用
                  </>
                )}
              </Badge>
              <Button
                size="sm"
                variant={capability.enabled ? "outline" : "default"}
                onClick={() => onToggle(capability.id, !capability.enabled)}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : capability.enabled ? (
                  "禁用"
                ) : (
                  "启用"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 详情弹窗 */}
      <CapabilityDetailDialog
        capability={showDetail ? capability : null}
        open={showDetail}
        onClose={() => setShowDetail(false)}
      />
    </>
  );
}

// 能力列表内容组件
function CapabilitiesContent() {
  const { data, isLoading, error } = useCapabilityList();
  const updateCapability = useUpdateCapability();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "status" | "updatedAt">("name");
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchUpdating, setBatchUpdating] = useState(false);

  const handleToggle = async (id: string, enabled: boolean) => {
    await updateCapability.mutateAsync({ id, enabled });
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (!data?.data) return;
    if (selectedIds.size === filteredCapabilities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCapabilities.map(cap => cap.id)));
    }
  };

  // 单选/取消单选
  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 批量启用
  const handleBatchEnable = async () => {
    if (selectedIds.size === 0) return;
    setBatchUpdating(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await updateCapability.mutateAsync({ id, enabled: true });
      }
      setSelectedIds(new Set());
    } finally {
      setBatchUpdating(false);
    }
  };

  // 批量禁用
  const handleBatchDisable = async () => {
    if (selectedIds.size === 0) return;
    setBatchUpdating(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await updateCapability.mutateAsync({ id, enabled: false });
      }
      setSelectedIds(new Set());
    } finally {
      setBatchUpdating(false);
    }
  };

  // 过滤和排序后的能力列表
  const filteredCapabilities = useMemo(() => {
    if (!data?.data) return [];
    
    let result = [...data.data];
    
    // 搜索过滤
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(cap => 
        cap.name.toLowerCase().includes(keyword) ||
        cap.description.toLowerCase().includes(keyword)
      );
    }
    
    // 排序
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "status":
          return (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0);
        case "updatedAt":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });
    
    return result;
  }, [data?.data, searchKeyword, sortBy]);

  // 分组后的能力列表
  const groupedCapabilities = useMemo(() => {
    if (!groupByCategory) return null;
    
    const groups: Record<string, Capability[]> = {};
    filteredCapabilities.forEach(cap => {
      const category = categoryMap[cap.name] || "其他";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(cap);
    });
    return groups;
  }, [filteredCapabilities, groupByCategory]);

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题和统计 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">辅助能力管理</h1>
          <p className="text-gray-500 mt-1">配置和管理辅助能力开关</p>
        </div>
        <Badge variant="info">
          共 {data?.total || 0} 项能力
        </Badge>
      </div>

      {/* 搜索和排序工具栏 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* 搜索框 */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索能力名称或描述..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* 排序下拉框 */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "name" | "status" | "updatedAt")}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="name">按名称</option>
                <option value="status">按状态</option>
                <option value="updatedAt">按更新时间</option>
              </select>
            </div>

            {/* 分组开关 */}
            <Button
              variant={groupByCategory ? "default" : "outline"}
              size="sm"
              onClick={() => setGroupByCategory(!groupByCategory)}
            >
              {groupByCategory ? "取消分组" : "按类别分组"}
            </Button>
          </div>
          
          {/* 搜索结果提示 */}
          {searchKeyword && (
            <p className="text-sm text-gray-500 mt-2">
              找到 {filteredCapabilities.length} 项匹配
            </p>
          )}
        </CardContent>
      </Card>

      {/* 批量操作工具栏 */}
      {selectedIds.size > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                已选择 {selectedIds.size} 项能力
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleBatchEnable}
                  disabled={batchUpdating}
                >
                  {batchUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-1" />
                  )}
                  批量启用
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBatchDisable}
                  disabled={batchUpdating}
                >
                  {batchUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-1" />
                  )}
                  批量禁用
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                >
                  取消选择
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 能力列表 */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              加载中...
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center text-red-500">
              加载失败，请稍后重试
            </CardContent>
          </Card>
        ) : filteredCapabilities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              {searchKeyword ? "暂无匹配的能力" : "暂无能力配置"}
            </CardContent>
          </Card>
        ) : groupByCategory && groupedCapabilities ? (
          // 分组展示
          Object.entries(groupedCapabilities).map(([category, caps]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2 px-1">
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {selectedIds.size === filteredCapabilities.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                )}
                <h3 className="text-sm font-medium text-gray-500">{category}</h3>
              </div>
              <div className="space-y-2">
                {caps.map((capability) => (
                  <CapabilityCard
                    key={capability.id}
                    capability={capability}
                    onToggle={handleToggle}
                    isUpdating={updateCapability.isPending}
                    selected={selectedIds.has(capability.id)}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          // 列表展示
          <>
            {/* 全选行 */}
            {filteredCapabilities.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg mb-2">
                <button
                  onClick={handleSelectAll}
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
                >
                  {selectedIds.size === filteredCapabilities.length && selectedIds.size > 0 ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-600">
                    {selectedIds.size === filteredCapabilities.length && selectedIds.size > 0 
                      ? "取消全选" 
                      : "全选"}
                  </span>
                </button>
                <span className="text-sm text-gray-400">
                  ({selectedIds.size}/{filteredCapabilities.length})
                </span>
              </div>
            )}
            {filteredCapabilities.map((capability) => (
              <CapabilityCard
                key={capability.id}
                capability={capability}
                onToggle={handleToggle}
                isUpdating={updateCapability.isPending}
                selected={selectedIds.has(capability.id)}
                onSelect={handleSelect}
              />
            ))}
          </>
        )}
      </div>

      {/* 说明 */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm text-gray-600">使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• 启用/禁用辅助能力来控制 AI 代理的权限范围</li>
            <li>• 禁用某项能力后，相关功能将对所有代理不可用</li>
            <li>• 能力状态变更将实时生效</li>
            <li>• 支持搜索、排序和按类别分组查看</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// 默认导出（带 Suspense）
export default function CapabilitiesPage() {
  return (
    <Suspense fallback={<CapabilitiesLoading />}>
      <CapabilitiesContent />
    </Suspense>
  );
}
