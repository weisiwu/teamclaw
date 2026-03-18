import { useState } from 'react';
import { Link2, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { verifyDownloadUrl, type DownloadUrlVerification } from '@/lib/api/versions';

interface DownloadUrlVerifierProps {
  versionId: string;
  version: string;
  url: string;
  onVerify?: (result: DownloadUrlVerification) => void;
}

export function DownloadUrlVerifier({
  versionId,
  version,
  url,
  onVerify,
}: DownloadUrlVerifierProps) {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<DownloadUrlVerification | null>(null);

  const handleVerify = async () => {
    if (!url) return;
    
    setVerifying(true);
    setResult(null);
    
    try {
      const verification = await verifyDownloadUrl(versionId, url);
      setResult(verification);
      onVerify?.(verification);
    } catch (error) {
      console.error('Verification failed:', error);
      setResult({
        versionId,
        version,
        url,
        isValid: false,
        error: 'Verification failed',
      });
    } finally {
      setVerifying(false);
    }
  };

  const getStatusIcon = () => {
    if (verifying) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    }
    if (!result) {
      return <Link2 className="w-4 h-4 text-gray-400" />;
    }
    if (result.isValid) {
      return <Check className="w-4 h-4 text-green-500" />;
    }
    return <X className="w-4 h-4 text-red-500" />;
  };

  const getStatusText = () => {
    if (verifying) return '验证中...';
    if (!result) return '点击验证';
    if (result.isValid) return '链接有效';
    return '链接无效';
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleVerify}
        disabled={!url || verifying}
        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title={url || '无链接'}
      >
        {getStatusIcon()}
        <span className={!result ? 'text-gray-500' : result.isValid ? 'text-green-600' : 'text-red-600'}>
          {getStatusText()}
        </span>
      </button>
      
      {result?.isValid && (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {result.fileSize && (
            <span>大小: {result.fileSize}MB</span>
          )}
          {result.lastModified && (
            <span>
              更新: {new Date(result.lastModified).toLocaleDateString('zh-CN')}
            </span>
          )}
        </div>
      )}
      
      {result && !result.isValid && (
        <div className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="w-3 h-3" />
          <span>{result.error}</span>
        </div>
      )}
    </div>
  );
}
