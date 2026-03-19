'use client';

import { useState } from 'react';
import type { FileNode } from '../lib/api/projects';

interface FileTreeProps {
  node: FileNode;
  depth?: number;
}

function FileIcon({ name, type }: { name: string; type: string }) {
  if (type === 'dir') return <span className="text-yellow-500 mr-1">📁</span>;
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    ts: '🔷', tsx: '⚛️', js: '🟨', jsx: '⚛️',
    md: '📝', json: '📋', css: '🎨', scss: '🎨',
    png: '🖼️', jpg: '🖼️', svg: '🖼️',
    html: '🌐', py: '🐍', go: '🐹', rs: '🦀',
  };
  return <span className="mr-1">{iconMap[ext] || '📄'}</span>;
}

export function FileTree({ node, depth = 0 }: FileTreeProps) {
  const [open, setOpen] = useState(depth < 2);

  if (node.type === 'file') {
    return (
      <div className="pl-4 py-0.5 text-sm text-gray-700 hover:text-blue-600 cursor-default truncate">
        <FileIcon name={node.name} type="file" />
        <span className="truncate">{node.name}</span>
      </div>
    );
  }

  return (
    <div>
      <button
        className="w-full flex items-center pl-2 py-0.5 text-sm text-gray-800 hover:bg-gray-100 rounded cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={() => setOpen(!open)}
      >
        <span className="mr-1 text-xs text-gray-400">{open ? '▼' : '▶'}</span>
        <FileIcon name={node.name} type="dir" />
        <span className="font-medium">{node.name}/</span>
      </button>
      {open && node.children && (
        <div>
          {node.children.map((child, i) => (
            <FileTree key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileTreeViewProps {
  tree: FileNode;
}

export function FileTreeView({ tree }: FileTreeViewProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <FileTree node={tree} />
    </div>
  );
}
