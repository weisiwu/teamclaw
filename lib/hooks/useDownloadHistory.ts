'use client';

import { useState, useEffect, useCallback } from 'react';

export interface DownloadRecord {
  id: string;
  versionId: string;
  versionName: string;
  artifactName: string;
  artifactPath: string;
  fileSize: number;
  fileSizeFormatted: string;
  downloadedAt: string;
}

const STORAGE_KEY = 'teamclaw_download_history';
const MAX_RECORDS = 50;

function generateId(): string {
  return `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function loadFromStorage(): DownloadRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(records: DownloadRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // storage full or unavailable
  }
}

export function useDownloadHistory() {
  const [records, setRecords] = useState<DownloadRecord[]>([]);

  // Load from storage on mount
  useEffect(() => {
    setRecords(loadFromStorage());
  }, []);

  const addRecord = useCallback(
    (params: {
      versionId: string;
      versionName: string;
      artifactName: string;
      artifactPath: string;
      fileSize?: number;
    }) => {
      const newRecord: DownloadRecord = {
        id: generateId(),
        versionId: params.versionId,
        versionName: params.versionName,
        artifactName: params.artifactName,
        artifactPath: params.artifactPath,
        fileSize: params.fileSize ?? 0,
        fileSizeFormatted: formatBytes(params.fileSize ?? 0),
        downloadedAt: new Date().toISOString(),
      };
      setRecords((prev) => {
        const updated = [newRecord, ...prev].slice(0, MAX_RECORDS);
        saveToStorage(updated);
        return updated;
      });
    },
    []
  );

  const clearHistory = useCallback(() => {
    setRecords([]);
    saveToStorage([]);
  }, []);

  const removeRecord = useCallback((id: string) => {
    setRecords((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const getRecordsByVersion = useCallback(
    (versionId: string) => records.filter((r) => r.versionId === versionId),
    [records]
  );

  return {
    records,
    addRecord,
    clearHistory,
    removeRecord,
    getRecordsByVersion,
  };
}
