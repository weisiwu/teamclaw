"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LegacySelect } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  PlayCircle,
  PauseCircle,
  Edit,
  Clock,
  History,
  Loader2,
} from "lucide-react";
import {
  useCronList,
  useCreateCron,
  useDeleteCron,
  useStartCron,
  useStopCron,
  useUpdateCron,
  useCronRuns,
} from "@/hooks/useCron";
import type { CronTask, CreateCronRequest } from "@/lib/api/types";
import { CRON_STATUS_LABELS, CRON_STATUS_BADGE_VARIANT } from "@/lib/api/constants";

// 定时任务卡片组件
function CronCard({
  cron,
  onEdit,
  onStart,
  onStop,
  onDelete,
  onViewLogs,
  pendingId,
}: {
  cron: CronTask;
  onEdit: (cron: CronTask) => void;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
  onViewLogs: (cron: CronTask) => void;
  pendingId: string | null;
}) {
  const isPending = pendingId === cron.id;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm text-gray-500">{cron.id}</span>
              <Badge variant={CRON_STATUS_BADGE_VARIANT[cron.status]}>
                {CRON_STATUS_LABELS[cron.status]}
              </Badge>
            </div>
            <h3 className="font-semibold text-foreground mb-1">{cron.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{cron.cron}</span>
              <span className="text-xs text-muted-foreground">
                (每{getCronDescription(cron.cron)})
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {cron.prompt}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>创建于：{cron.createdAt}</span>
              {cron.lastRunAt && <span>上次运行：{cron.lastRunAt}</span>}
              {cron.nextRunAt && cron.status === "running" && (
                <span>下次运行：{cron.nextRunAt}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(cron)}
              disabled={isPending}
            >
              <Edit className="w-4 h-4 mr-1" />
              编辑
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewLogs(cron)}
              disabled={isPending}
            >
              <History className="w-4 h-4 mr-1" />
              日志
            </Button>
            {cron.status === "running" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStop(cron.id)}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <PauseCircle className="w-4 h-4 mr-1" />
                )}
                停止
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => onStart(cron.id)}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <PlayCircle className="w-4 h-4 mr-1" />
                )}
                启动
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(cron.id)}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              ) : (
                <Trash2 className="w-4 h-4 text-red-500" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Cron 表达式描述
function getCronDescription(cron: string): string {
  const parts = cron.split(" ");
  if (parts.length !== 5) return "未知";

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // 每天
  if (minute !== "*" && hour !== "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `天 ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }
  // 每周
  if (dayOfWeek !== "*" && dayOfMonth === "*") {
    const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const days = dayOfWeek.split(",").map((d) => weekDays[parseInt(d)] || d).join("、");
    return `周 ${days}`;
  }
  // 每月
  if (dayOfMonth !== "*" && dayOfMonth !== "?" && month === "*" && dayOfWeek === "*") {
    return `月 ${dayOfMonth}日`;
  }

  return "自定义";
}

// 创建/编辑定时任务弹窗组件
function CronModal({
  isOpen,
  editCron,
  onClose,
}: {
  isOpen: boolean;
  editCron: CronTask | null;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<CreateCronRequest>({
    name: "",
    cron: "",
    prompt: "",
  });

  const createCron = useCreateCron();
  const updateCron = useUpdateCron();

  // 当编辑的 cron 变化时更新表单
  useEffect(() => {
    if (editCron) {
      setFormData({
        name: editCron.name,
        cron: editCron.cron,
        prompt: editCron.prompt,
      });
    } else {
      setFormData({ name: "", cron: "", prompt: "" });
    }
  }, [editCron]);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.cron.trim() || !formData.prompt.trim()) {
      return;
    }

    if (editCron) {
      await updateCron.mutateAsync({ id: editCron.id, data: formData });
    } else {
      await createCron.mutateAsync(formData);
    }
    setFormData({ name: "", cron: "", prompt: "" });
    onClose();
  };

  const isPending = createCron.isPending || updateCron.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editCron ? "编辑定时任务" : "添加定时任务"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              任务名称 *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入任务名称"
              className="bg-background text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Cron 表达式 *
            </label>
            <Input
              value={formData.cron}
              onChange={(e) => setFormData({ ...formData, cron: e.target.value })}
              placeholder="0 2 * * *"
              className="bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              示例：0 2 * * * 表示每天 02:00 执行
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              任务 Prompt *
            </label>
            <Textarea
              className="w-full min-h-[100px]"
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              placeholder="请输入任务执行的 Prompt 内容"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !formData.name.trim() ||
              !formData.cron.trim() ||
              !formData.prompt.trim() ||
              isPending
            }
          >
            {isPending ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 运行日志弹窗组件
function CronRunLogModal({
  isOpen,
  cron,
  onClose,
}: {
  isOpen: boolean;
  cron: CronTask | null;
  onClose: () => void;
}) {
  const { data: runs, isLoading, error } = useCronRuns(cron?.id || "");

  return (
    <Dialog open={isOpen && !!cron} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>运行日志</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{cron?.name}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">加载中...</div>
          ) : error ? (
            <div className="py-8 text-center text-red-500">加载失败</div>
          ) : runs && runs.length > 0 ? (
            runs.map((run) => (
              <Card key={run.id} className="bg-muted">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{run.startTime}</span>
                      <Badge
                        variant={run.status === "success" ? "success" : run.status === "failed" ? "error" : "info"}
                      >
                        {run.status === "success" ? "成功" : run.status === "failed" ? "失败" : "运行中"}
                      </Badge>
                    </div>
                    {run.endTime && (
                      <span className="text-xs text-muted-foreground">
                        耗时：{Math.round((new Date(run.endTime).getTime() - new Date(run.startTime).getTime()) / 1000)}秒
                      </span>
                    )}
                  </div>
                  {run.output && (
                    <p className="text-sm text-foreground bg-background p-2 rounded border border-border line-clamp-2">
                      {run.output}
                    </p>
                  )}
                  {run.error && (
                    <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded border border-red-200 dark:border-red-800">
                      错误：{run.error}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="py-8 text-center text-muted-foreground">暂无运行记录</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CronPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCron, setEditCron] = useState<CronTask | null>(null);
  const [viewLogsCron, setViewLogsCron] = useState<CronTask | null>(null);
  const [searchName, setSearchName] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "running" | "stopped">("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // 使用 React Query 获取数据
  const { data, isLoading, error } = useCronList();

  // Mutations
  const deleteCron = useDeleteCron();
  const startCron = useStartCron();
  const stopCron = useStopCron();

  // 筛选后的任务列表
  const filteredData = data?.data.filter((cron) => {
    const matchName = searchName === "" || cron.name.toLowerCase().includes(searchName.toLowerCase());
    const matchStatus = filterStatus === "all" || cron.status === filterStatus;
    return matchName && matchStatus;
  }) || [];

  // 打开创建弹窗
  const handleOpenCreateModal = () => {
    setEditCron(null);
    setIsModalOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (cron: CronTask) => {
    setEditCron(cron);
    setIsModalOpen(true);
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditCron(null);
  };

  // 打开日志弹窗
  const handleViewLogs = (cron: CronTask) => {
    setViewLogsCron(cron);
  };

  // 关闭日志弹窗
  const handleCloseLogsModal = () => {
    setViewLogsCron(null);
  };

  // 删除处理（先确认再执行）
  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setPendingId(confirmDeleteId);
    try {
      await deleteCron.mutateAsync(confirmDeleteId);
    } finally {
      setPendingId(null);
      setConfirmDeleteId(null);
    }
  };

  // 启动处理
  const handleStart = async (id: string) => {
    setPendingId(id);
    try {
      await startCron.mutateAsync(id);
    } finally {
      setPendingId(null);
    }
  };

  // 停止处理
  const handleStop = async (id: string) => {
    setPendingId(id);
    try {
      await stopCron.mutateAsync(id);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <>
      <div className="page-container">
        {/* 页面标题 */}
        <div className="page-header">
          <div>
            <h1 className="page-header-title">定时任务</h1>
            <p className="page-header-subtitle">管理自动执行的任务</p>
          </div>
          <Button onClick={handleOpenCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            添加定时任务
          </Button>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-xs">
            <Input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="搜索任务名称..."
              className="w-full"
            />
          </div>
          <LegacySelect
            value={filterStatus}
            onValueChange={(value) => setFilterStatus(value as "all" | "running" | "stopped")}
            options={[
              { value: "all", label: "全部状态" },
              { value: "running", label: "运行中" },
              { value: "stopped", label: "已停止" },
            ]}
            className="w-auto min-w-[120px]"
          />
        </div>

        {/* 定时任务列表 */}
        <div className="space-y-3">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                加载中...
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="py-12 text-center text-red-500">
                加载失败，请稍后重试
              </CardContent>
            </Card>
          ) : filteredData.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                {searchName || filterStatus !== "all" ? "暂无匹配结果" : "暂无定时任务"}
              </CardContent>
            </Card>
          ) : (
            filteredData.map((cron) => (
              <CronCard
                key={cron.id}
                cron={cron}
                onEdit={handleEdit}
                onStart={handleStart}
                onStop={handleStop}
                onDelete={handleDelete}
                onViewLogs={handleViewLogs}
                pendingId={pendingId}
              />
            ))
          )}
        </div>
      </div>

      {/* 创建/编辑弹窗 */}
      <CronModal
        isOpen={isModalOpen}
        editCron={editCron}
        onClose={handleCloseModal}
      />

      {/* 运行日志弹窗 */}
      <CronRunLogModal
        isOpen={!!viewLogsCron}
        cron={viewLogsCron}
        onClose={handleCloseLogsModal}
      />

      {/* 删除确认弹窗 */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            确定要删除定时任务 <strong>{confirmDeleteId ? filteredData.find(c => c.id === confirmDeleteId)?.name : ""}</strong> 吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteCron.isPending}
            >
              {deleteCron.isPending ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
