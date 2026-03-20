import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn() - Tailwind class merger', () => {
  it('merges two simple classes', () => {
    const result = cn('text-red-500', 'bg-blue-500');
    expect(result).toBe('text-red-500 bg-blue-500');
  });

  it('deduplicates conflicting tailwind classes (last wins)', () => {
    const result = cn('text-red-500 text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('handles empty inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles clsx ClassValue arrays', () => {
    const result = cn(['text-red-500', 'bg-blue-500']);
    expect(result).toContain('text-red-500');
    expect(result).toContain('bg-blue-500');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class', !isActive && 'inactive-class');
    expect(result).toContain('base-class');
    expect(result).toContain('active-class');
    expect(result).not.toContain('inactive-class');
  });

  it('deduplicates with tailwind-merge', () => {
    // When same class appears multiple times, tailwind-merge deduplicates
    const result = cn('px-4 px-4 px-4');
    expect(result).toBe('px-4');
  });

  it('merges multiple different classes', () => {
    const result = cn('text-sm', 'font-medium', 'text-gray-900', 'dark:text-white');
    expect(result).toContain('text-sm');
    expect(result).toContain('font-medium');
    expect(result).toContain('text-gray-900');
    expect(result).toContain('dark:text-white');
  });
});
