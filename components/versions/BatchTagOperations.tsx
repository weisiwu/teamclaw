"use client";

import { useState } from "react";
import { useVersions } from "@/lib/api/versions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LegacySelect as Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { BatchTagRequest } from "@/lib/api/types";
import { 
  Tags, 
  Archive, 
  Trash2, 
  Plus, 
  CheckCircle2,
  XCircle,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
  Package
} from "lucide-react";

function Checkbox({ 
  checked, 
  onCheckedChange,
  disabled 
}: { 
  checked: boolean; 
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      className={`p-1 rounded ${checked ? "text-blue-600" : "text-gray-400"} ${!disabled && "hover:text-blue-600"}`}
    >
      {checked ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
    </button>
  );
}

export function BatchTagOperations() {
  const { data: versionsData, isLoading, isError, refetch } = useVersions(1, 100, "all");
  const versions = versionsData?.data || [];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [action, setAction] = useState<BatchTagRequest["action"]>("create");
  const [prefix, setPrefix] = useState("v");
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    totalSuccess: number;
    totalFailed: number;
  } | null>(null);

  const selectedVersions = versions.filter(v => selectedIds.includes(v.id));

  const handleSelectAll = () => {
    if (selectedIds.length === versions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(versions.map(v => v.id));
    }
  };

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBatchAction = async () => {
    // This would call the actual API - for now simulate
    setResult({
      success: true,
      totalSuccess: selectedIds.length,
      totalFailed: 0,
    });
    setIsOpen(false);
  };

  const getActionIcon = () => {
    switch (action) {
      case "create": return <Plus className="h-4 w-4" />;
      case "archive": return <Archive className="h-4 w-4" />;
      case "unarchive": return <Archive className="h-4 w-4" />;
      case "delete": return <Trash2 className="h-4 w-4" />;
    }
  };

  const getActionLabel = () => {
    switch (action) {
      case "create": return "Create Tags";
      case "archive": return "Archive Tags";
      case "unarchive": return "Unarchive Tags";
      case "delete": return "Delete Tags";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Tags className="h-4 w-4" />
          Batch Tag Operations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.length === versions.length && versions.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm">
                Select All ({selectedIds.length}/{versions.length})
              </span>
            </div>
            <Button 
              size="sm" 
              disabled={selectedIds.length === 0}
              onClick={() => setIsOpen(true)}
            >
              {getActionIcon()}
              <span className="ml-2">{getActionLabel()}</span>
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogContent title={`Batch ${getActionLabel()}`} onClose={() => setIsOpen(false)}>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    You are about to {action} {selectedIds.length} version(s).
                  </p>
                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium">Action</label>
                    <Select 
                      value={action} 
                      onChange={(e) => setAction(e.target.value as BatchTagRequest["action"])}
                      options={[
                        { value: "create", label: "Create Tags" },
                        { value: "archive", label: "Archive Tags" },
                        { value: "unarchive", label: "Unarchive Tags" },
                        { value: "delete", label: "Delete Tags" },
                      ]}
                    />
                  </div>
                  {action === "create" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tag Prefix</label>
                      <Select 
                        value={prefix} 
                        onChange={(e) => setPrefix(e.target.value)}
                        options={[
                          { value: "v", label: "v (e.g., v1.0.0)" },
                          { value: "release", label: "release (e.g., release-1.0.0)" },
                          { value: "version", label: "version (e.g., version-1.0.0)" },
                        ]}
                      />
                    </div>
                  )}
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Selected versions:</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {selectedVersions.map(v => (
                        <div key={v.id} className="flex items-center gap-2 text-sm">
                          <Badge variant="default">{v.version}</Badge>
                          <span className="truncate">{v.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleBatchAction}>
                    Confirm
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Version List */}
          <div className="space-y-1 max-h-60 overflow-y-auto border rounded-md p-2">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-2 p-2 animate-pulse">
                    <div className="w-4 h-4 bg-gray-200 rounded" />
                    <div className="h-4 w-12 bg-gray-200 rounded" />
                    <div className="h-4 flex-1 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                <p className="text-sm text-red-500 mb-3">加载版本失败</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <Loader2 className="w-3 h-3 mr-1.5" />
                  重试
                </Button>
              </div>
            ) : versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Package className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">暂无版本数据</p>
                <p className="text-xs text-gray-400 mt-1">创建版本后即可批量操作</p>
              </div>
            ) : (
              versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center gap-2 p-2 hover:bg-muted rounded-md"
                >
                  <Checkbox
                    checked={selectedIds.includes(version.id)}
                    onCheckedChange={() => handleSelect(version.id)}
                  />
                  <Badge variant="default">{version.version}</Badge>
                  <span className="text-sm truncate flex-1">{version.title}</span>
                  {version.gitTag && (
                    <Badge variant="info" className="text-xs">
                      {version.gitTag}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Result */}
          {result && (
            <div className={`p-3 rounded-md ${result.success ? "bg-green-50" : "bg-red-50"}`}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">
                  {result.success ? "Success" : "Partial Failure"}: 
                  {result.totalSuccess} succeeded, {result.totalFailed} failed
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default BatchTagOperations;
