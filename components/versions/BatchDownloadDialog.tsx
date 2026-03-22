import { useState } from 'react';
import { Download, X, Check, AlertCircle, Loader2 } from 'lucide-react';

interface BatchDownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  versions: Array<{
    id: string;
    version: string;
    artifactUrl?: string;
  }>;
}

const DOWNLOAD_FORMATS = [
  { value: 'zip', label: 'ZIP (.zip)' },
  { value: 'tar.gz', label: 'Tarball (.tar.gz)' },
  { value: 'apk', label: 'Android APK' },
  { value: 'ipa', label: 'iOS IPA' },
  { value: 'exe', label: 'Windows EXE' },
  { value: 'dmg', label: 'macOS DMG' },
];

export function BatchDownloadDialog({
  isOpen,
  onClose,
  versions,
}: BatchDownloadDialogProps) {
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [format, setFormat] = useState('zip');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadResults, setDownloadResults] = useState<Array<{
    versionId: string;
    version: string;
    success: boolean;
    error?: string;
  }> | null>(null);

  if (!isOpen) return null;

  const availableVersions = versions.filter((v) => v.artifactUrl);

  const toggleVersion = (versionId: string) => {
    setSelectedVersions((prev) =>
      prev.includes(versionId)
        ? prev.filter((id) => id !== versionId)
        : [...prev, versionId]
    );
  };

  const selectAll = () => {
    setSelectedVersions(availableVersions.map((v) => v.id));
  };

  const deselectAll = () => {
    setSelectedVersions([]);
  };

  const handleDownload = async () => {
    if (selectedVersions.length === 0) return;
    
    setIsDownloading(true);
    setDownloadResults(null);
    
    try {
      // Mock batch download results
      const results = selectedVersions.map((versionId) => {
        const version = versions.find((v) => v.id === versionId);
        return {
          versionId,
          version: version?.version || 'unknown',
          success: !!version?.artifactUrl,
          error: version?.artifactUrl ? undefined : 'No artifact available',
        };
      });
      
      // Simulate download delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setDownloadResults(results);
      
      // Trigger actual downloads
      for (const versionId of selectedVersions) {
        const version = versions.find((v) => v.id === versionId);
        if (version?.artifactUrl) {
          window.open(version.artifactUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Batch download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">批量下载产物</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {/* Format Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              下载格式
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {DOWNLOAD_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Version Selection */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                选择版本 ({selectedVersions.length}/{availableVersions.length})
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-blue-600 hover:underline"
                >
                  全选
                </button>
                <button
                  onClick={deselectAll}
                  className="text-xs text-gray-500 hover:underline"
                >
                  取消
                </button>
              </div>
            </div>
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {availableVersions.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  暂无可下载的版本
                </div>
              ) : (
                <div className="divide-y">
                  {availableVersions.map((version) => (
                    <label
                      key={version.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedVersions.includes(version.id)}
                        onChange={() => toggleVersion(version.id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="font-mono text-sm">{version.version}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Download Results */}
          {downloadResults && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">
                  下载结果
                  <span className="ml-2 text-muted-foreground font-normal">
                    ({downloadResults.filter(r => r.success).length}/{downloadResults.length} 成功)
                  </span>
                </h4>
                <button
                  onClick={() => setDownloadResults(null)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  清除结果
                </button>
              </div>
              <div className="space-y-1">
                {downloadResults.map((result) => (
                  <div
                    key={result.versionId}
                    className="flex items-center gap-2 text-sm"
                  >
                    {result.success ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span>{result.version}</span>
                    {result.error && (
                      <span className="text-red-500 text-xs">({result.error})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            关闭
          </button>
          <button
            onClick={handleDownload}
            disabled={selectedVersions.length === 0 || isDownloading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                下载中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                批量下载 ({selectedVersions.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
