"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Trash2, Tag, FolderOpen } from "lucide-react";

export interface TagGroup {
  id: string;
  name: string;
  color: string;
  tagNames: string[];
}

interface TagGroupManagerProps {
  groups: TagGroup[];
  onGroupsChange: (groups: TagGroup[]) => void;
  availableTags: string[];
}

const COLOR_OPTIONS = [
  "#3B82F6", // 蓝色
  "#10B981", // 绿色
  "#F59E0B", // 黄色
  "#EF4444", // 红色
  "#8B5CF6", // 紫色
  "#EC4899", // 粉色
  "#06B6D4", // 青色
  "#F97316", // 橙色
];

export function TagGroupManager({ groups, onGroupsChange, availableTags }: TagGroupManagerProps) {
  const [localGroups, setLocalGroups] = useState<TagGroup[]>(groups);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [isCreating, setIsCreating] = useState(false);

  // 同步外部变化
  useEffect(() => {
    setLocalGroups(groups);
  }, [groups]);

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    
    const newGroup: TagGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      color: selectedColor,
      tagNames: [],
    };
    
    const updated = [...localGroups, newGroup];
    setLocalGroups(updated);
    onGroupsChange(updated);
    
    setNewGroupName("");
    setSelectedColor(COLOR_OPTIONS[0]);
    setIsCreating(false);
  };

  const handleDeleteGroup = (id: string) => {
    const updated = localGroups.filter(g => g.id !== id);
    setLocalGroups(updated);
    onGroupsChange(updated);
  };

  const handleAddTagToGroup = (groupId: string, tagName: string) => {
    const updated = localGroups.map(g => {
      if (g.id === groupId && !g.tagNames.includes(tagName)) {
        return { ...g, tagNames: [...g.tagNames, tagName] };
      }
      return g;
    });
    setLocalGroups(updated);
    onGroupsChange(updated);
  };

  const handleRemoveTagFromGroup = (groupId: string, tagName: string) => {
    const updated = localGroups.map(g => {
      if (g.id === groupId) {
        return { ...g, tagNames: g.tagNames.filter(t => t !== tagName) };
      }
      return g;
    });
    setLocalGroups(updated);
    onGroupsChange(updated);
  };

  const availableTagsForGroup = (group: TagGroup) => {
    return availableTags.filter(t => !group.tagNames.includes(t));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          Tag 分组管理
        </h4>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsCreating(true)}
          disabled={isCreating}
        >
          <Plus className="w-4 h-4 mr-1" />新建分组
        </Button>
      </div>

      {/* 新建分组表单 */}
      {isCreating && (
        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="分组名称"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={handleCreateGroup}>
              <Plus className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">颜色:</span>
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color}
                className={`w-6 h-6 rounded-full border-2 ${
                  selectedColor === color ? "border-gray-800" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 分组列表 */}
      {localGroups.length === 0 && !isCreating ? (
        <div className="text-center py-8 text-gray-500">
          <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">暂无分组</p>
        </div>
      ) : (
        <div className="space-y-3">
          {localGroups.map((group) => (
            <div key={group.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="font-medium">{group.name}</span>
                  <span className="text-xs text-gray-500">({group.tagNames.length} 个 Tag)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDeleteGroup(group.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
              
              {/* 分组中的 Tags */}
              <div className="flex flex-wrap gap-1 mb-2">
                {group.tagNames.map((tagName) => (
                  <span
                    key={tagName}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                    style={{ backgroundColor: `${group.color}20`, color: group.color }}
                  >
                    <Tag className="w-3 h-3" />
                    {tagName}
                    <button
                      className="hover:text-red-500"
                      onClick={() => handleRemoveTagFromGroup(group.id, tagName)}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              
              {/* 添加 Tag */}
              {availableTagsForGroup(group).length > 0 && (
                <select
                  className="text-xs p-1 border rounded"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddTagToGroup(group.id, e.target.value);
                    }
                  }}
                >
                  <option value="">+ 添加 Tag</option>
                  {availableTagsForGroup(group).map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Hook for managing tag groups in localStorage
export function useTagGroups() {
  const [groups, setGroups] = useState<TagGroup[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("tagGroups");
    if (saved) {
      try {
        setGroups(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse tag groups:", e);
      }
    }
  }, []);

  const updateGroups = (newGroups: TagGroup[]) => {
    setGroups(newGroups);
    localStorage.setItem("tagGroups", JSON.stringify(newGroups));
  };

  return { groups, updateGroups };
}

// Hook for managing favorite tags in localStorage
export function useFavoriteTags() {
  const [favorites, setFavorites] = useState<Array<{ tagName: string; addedAt: string }>>([]);

  useEffect(() => {
    const saved = localStorage.getItem("favoriteTags");
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse favorite tags:", e);
      }
    }
  }, []);

  const addFavorite = (tagName: string) => {
    const updated = [...favorites, { tagName, addedAt: new Date().toISOString() }];
    setFavorites(updated);
    localStorage.setItem("favoriteTags", JSON.stringify(updated));
  };

  const removeFavorite = (tagName: string) => {
    const updated = favorites.filter(f => f.tagName !== tagName);
    setFavorites(updated);
    localStorage.setItem("favoriteTags", JSON.stringify(updated));
  };

  const isFavorite = (tagName: string) => {
    return favorites.some(f => f.tagName === tagName);
  };

  return { favorites, addFavorite, removeFavorite, isFavorite };
}
