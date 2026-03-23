/**
 * ChangelogPanel Component Tests - Basic
 * 覆盖 components/versions/ChangelogPanel.tsx 基础渲染
 * @jest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChangelogPanel } from '../../components/versions/ChangelogPanel';
import type { VersionChangelog } from '../../lib/api/types';

// Mock the API
vi.mock('../../lib/api/versions', () => ({
  saveVersionSummary: vi.fn().mockResolvedValue({ id: 'summary-1', versionId: 'v-1' }),
}));

// Mock data
const mockChangelog: VersionChangelog = {
  id: 'changelog-1',
  versionId: 'v-test-1',
  content: '## Changes\n- Fixed bug\n- Added feature',
  generatedAt: '2026-03-21T10:00:00.000Z',
  generatedBy: 'system',
  changes: [
    { type: 'fix', description: 'Fixed bug in login', commitHash: 'abc123' },
    { type: 'feature', description: 'Added dark mode', commitHash: 'def456' },
  ],
};

describe('ChangelogPanel', () => {
  const mockOnGenerate = vi.fn();

  describe('Rendering', () => {
    it('should render changelog content with changes', () => {
      render(
        <ChangelogPanel
          changelog={mockChangelog}
          onGenerate={mockOnGenerate}
          loading={false}
          generating={false}
        />
      );

      // Check for changelog content
      expect(screen.getByText('Fixed bug in login')).toBeInTheDocument();
      expect(screen.getByText('Added dark mode')).toBeInTheDocument();
      
      // Check for change type labels
      expect(screen.getByText('新功能')).toBeInTheDocument();
      expect(screen.getByText('修复')).toBeInTheDocument();
    });

    it('should show generating state', () => {
      render(
        <ChangelogPanel
          changelog={null}
          onGenerate={mockOnGenerate}
          loading={false}
          generating={true}
        />
      );

      // Check for generating text in document
      expect(document.body.textContent).toContain('生成中');
    });
  });

  describe('Change Type Display', () => {
    it('should display correct labels for all change types', () => {
      const changelogWithTypes: VersionChangelog = {
        ...mockChangelog,
        changes: [
          { type: 'feature', description: 'New feature' },
          { type: 'fix', description: 'Bug fix' },
          { type: 'improvement', description: 'Improvement' },
          { type: 'breaking', description: 'Breaking change' },
          { type: 'docs', description: 'Documentation' },
          { type: 'refactor', description: 'Code refactor' },
          { type: 'other', description: 'Other change' },
        ],
      };

      render(
        <ChangelogPanel
          changelog={changelogWithTypes}
          onGenerate={mockOnGenerate}
          loading={false}
          generating={false}
        />
      );

      expect(screen.getByText('新功能')).toBeInTheDocument();
      expect(screen.getByText('修复')).toBeInTheDocument();
      expect(screen.getByText('改进')).toBeInTheDocument();
      expect(screen.getByText('破坏性变更')).toBeInTheDocument();
      expect(screen.getByText('文档')).toBeInTheDocument();
      expect(screen.getByText('重构')).toBeInTheDocument();
      expect(screen.getByText('其他')).toBeInTheDocument();
    });
  });
});
