'use client';

import { Button } from '@/components/ui/button';

interface DownloadButtonProps {
  slug: string;
  title: string;
}

export default function DownloadButton({ slug, title }: DownloadButtonProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/download?slug=${encodeURIComponent(slug)}`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      下载
    </Button>
  );
}
