"use client";

import { useState } from "react";
import { TagLifecycleRecord } from "@/lib/api/types";
import { useAllTags, useArchiveTag, useTagProtection, useDeleteTag, useRenameTag } from "@/lib/api/versions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Archive, Lock, Unlock, Trash2, RefreshCw, Pencil, Check, X } from "lucide-react";

interface TagLifecyclePanelProps {
  versionId?: string;
}

export function TagLifecyclePanel({ versionId }: TagLifecyclePanelProps) {
  const { data: tags = [], isLoading, refetch } = useAllTags();
  const archiveTag = useArchiveTag();
  const setProtection = useTagProtection();
  const deleteTag = useDeleteTag();
  const renameTag = useRenameTag();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Filter tags by versionId if provided
  const filteredTags = versionId
    ? tags.filter(t => t.versionId === versionId)
    : tags;

  const handleArchive = async (tag: TagLifecycleRecord) => {
    await archiveTag.mutateAsync({ tagId: tag.id, archive: !tag.archived });
    refetch();
  };

  const handleSetProtection = async (tag: TagLifecycleRecord) => {
    await setProtection.mutateAsync({ tagId: tag.id, protect: !tag.protected });
    refetch();
  };

  const handleDelete = async (tag: TagLifecycleRecord) => {
    if (tag.protected) {
      alert("Cannot delete protected tag");
      return;
    }
    await deleteTag.mutateAsync(tag.id);
    refetch();
  };

  const startRename = (tag: TagLifecycleRecord) => {
    if (tag.protected) return;
    setRenamingId(tag.id);
    setRenameValue(tag.name);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const confirmRename = async (tag: TagLifecycleRecord) => {
    if (!renameValue.trim() || renameValue === tag.name) {
      cancelRename();
      return;
    }
    await renameTag.mutateAsync({ tagId: tag.id, name: renameValue.trim() });
    cancelRename();
    refetch();
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading tags...</div>;
  }

  if (filteredTags.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Tag Lifecycle</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No tags found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">
          Tag Lifecycle ({filteredTags.length})
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filteredTags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-2 border rounded-md"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {renamingId === tag.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="h-7 text-sm font-mono"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename(tag);
                        if (e.key === "Escape") cancelRename();
                      }}
                    />
                    <Button size="sm" variant="ghost" onClick={() => confirmRename(tag)} disabled={renameTag.isPending}>
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelRename}>
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="font-mono text-sm truncate">{tag.name}</span>
                    {tag.archived && (
                      <Badge variant="info" className="text-xs">
                        <Archive className="h-3 w-3 mr-1" />
                        Archived
                      </Badge>
                    )}
                    {tag.protected && (
                      <Badge variant="warning" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        Protected
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                {renamingId !== tag.id && !tag.protected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startRename(tag)}
                    title="Rename"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleArchive(tag)}
                  disabled={archiveTag.isPending || tag.protected}
                  title={tag.archived ? "Unarchive" : "Archive"}
                >
                  {tag.archived ? (
                    <Unlock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Archive className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSetProtection(tag)}
                  disabled={setProtection.isPending}
                  title={tag.protected ? "Unprotect" : "Protect"}
                >
                  {tag.protected ? (
                    <Unlock className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(tag)}
                  disabled={deleteTag.isPending || tag.protected}
                  title={tag.protected ? "Cannot delete protected tag" : "Delete"}
                  className={tag.protected ? "opacity-50" : ""}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default TagLifecyclePanel;
