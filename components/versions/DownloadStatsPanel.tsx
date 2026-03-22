import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Download, FileArchive, Calendar } from 'lucide-react';
import { getDownloadStats, type DownloadStats } from '@/lib/api/versions';

export function DownloadStatsPanel() {
  const [stats, setStats] = useState<DownloadStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getDownloadStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load download stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg border">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Find max for chart scaling
  const maxCount = Math.max(...stats.recentTrend.map((d) => d.count), 1);

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold">下载统计</h3>
        <button
          onClick={loadStats}
          className="ml-auto text-xs text-gray-500 hover:text-blue-600"
        >
          刷新
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Download className="w-4 h-4" />
            <span className="text-xs">总下载量</span>
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {stats.totalDownloads}
          </div>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">本月趋势</span>
          </div>
          <div className="text-2xl font-bold text-green-700">
            +{stats.recentTrend.reduce((a, b) => a + b.count, 0)}
          </div>
        </div>
      </div>

      {/* Recent Trend Chart */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">最近7天趋势</span>
        </div>
        <div className="flex items-end gap-1 h-20">
          {stats.recentTrend.map((day, index) => {
            const height = Math.max((day.count / maxCount) * 100, 5);
            const date = new Date(day.date);
            const label = `${date.getMonth() + 1}/${date.getDate()}`;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-400 rounded-t hover:bg-blue-500 transition-colors"
                  style={{ height: `${height}%` }}
                  title={`${day.count} 次下载`}
                ></div>
                <span className="text-[10px] text-gray-500 mt-1">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Versions */}
      {stats.downloadsByVersion.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileArchive className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">热门版本</span>
          </div>
          <div className="space-y-1">
            {stats.downloadsByVersion
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
              .map((item, index) => (
                <div
                  key={item.version}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded-full text-xs">
                      {index + 1}
                    </span>
                    <span className="font-mono">{item.version}</span>
                  </div>
                  <span className="text-gray-500">{item.count} 次</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Format Distribution */}
      {stats.downloadsByFormat.length > 0 && (
        <div>
          <div className="text-sm text-gray-600 mb-2">格式分布</div>
          <div className="space-y-2">
            {stats.downloadsByFormat.map((item) => {
              const maxCount = Math.max(...stats.downloadsByFormat.map(d => d.count), 1);
              const pct = Math.round((item.count / maxCount) * 100);
              return (
                <div key={item.format} className="flex items-center gap-2 text-xs">
                  <span className="w-12 font-mono text-gray-500 shrink-0">{item.format}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-gray-500 shrink-0">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
