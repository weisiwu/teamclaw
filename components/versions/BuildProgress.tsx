'use client';

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';

interface BuildProgressProps {
  buildId: string;
  versionName: string;
  onComplete?: (status: 'success' | 'failed') => void;
}

export function BuildProgress({ buildId, versionName, onComplete }: BuildProgressProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'building' | 'success' | 'failed'>('building');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // 模拟构建进度
    const logMessages = [
      `[${new Date().toLocaleTimeString()}] 开始构建版本 ${versionName}...`,
      `[${new Date().toLocaleTimeString()}] 正在安装依赖...`,
      `[${new Date().toLocaleTimeString()}] 依赖安装完成`,
      `[${new Date().toLocaleTimeString()}] 开始编译代码...`,
      `[${new Date().toLocaleTimeString()}] 代码编译完成`,
      `[${new Date().toLocaleTimeString()}] 开始打包...`,
      `[${new Date().toLocaleTimeString()}] 打包完成`,
    ];

    let currentLog = 0;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 15) + 5;
        if (next >= 100) {
          clearInterval(interval);
          setStatus('success');
          onComplete?.('success');
          return 100;
        }
        
        // 添加日志
        if (currentLog < logMessages.length && next > currentLog * 15) {
          setLogs((prevLogs) => [...prevLogs, logMessages[currentLog]]);
          currentLog++;
        }
        
        return next;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [buildId, versionName, onComplete]);

  return (
    <div className="space-y-3 p-4 bg-card rounded-lg border">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">构建进度</span>
        <span className="text-sm text-muted-foreground">
          {status === 'building' ? `${progress}%` : status === 'success' ? '✅ 成功' : '❌ 失败'}
        </span>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      {logs.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => {
              const logEl = document.getElementById(`build-logs-${buildId}`);
              if (logEl) {
                logEl.classList.toggle('hidden');
              }
            }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <span>📜</span> 查看构建日志 ({logs.length} 条)
          </button>
          
          <div id={`build-logs-${buildId}`} className="hidden mt-2 p-2 bg-muted rounded text-xs font-mono max-h-32 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className="text-muted-foreground">{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
