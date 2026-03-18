"use client";

import { useEffect, useState } from "react";
import { findSimilarVersions } from "@/lib/api/versions";
import { Version, VectorSearchResult } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";

interface SimilarVersionsPanelProps {
  versionId: string;
  onSelectVersion: (version: Version) => void;
}

export function SimilarVersionsPanel({ versionId, onSelectVersion }: SimilarVersionsPanelProps) {
  const [similarVersions, setSimilarVersions] = useState<VectorSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSimilarVersions() {
      setLoading(true);
      try {
        const results = await findSimilarVersions(versionId, 5);
        setSimilarVersions(results);
      } catch (error) {
        console.error("Failed to load similar versions:", error);
      } finally {
        setLoading(false);
      }
    }

    if (versionId) {
      loadSimilarVersions();
    }
  }, [versionId]);

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-500">
        正在加载相似版本...
      </div>
    );
  }

  if (similarVersions.length === 0) {
    return null;
  }

  return (
    <div className="border-t px-4 py-3 bg-gray-50">
      <h4 className="text-sm font-medium text-gray-700 mb-3">
        相似版本
      </h4>
      <div className="space-y-2">
        {similarVersions.map((result) => (
          <div
            key={result.version.id}
            className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
            onClick={() => onSelectVersion(result.version)}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {result.version.version}
              </span>
              <span className="text-xs text-gray-500">
                {result.version.title}
              </span>
            </div>
            <Badge variant="default" className="text-xs">
              {Math.round(result.similarity * 100)}% 相似
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
