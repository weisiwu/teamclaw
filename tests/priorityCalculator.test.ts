import { describe, it, expect } from 'vitest';
import {
  calculatePriority,
  detectUrgency,
  enrichMessagePriority,
  shouldPreempt,
  getPriorityLevel,
  getPriorityColor,
} from '@/server/src/services/priorityCalculator';

describe('calculatePriority', () => {
  it('returns roleWeight * urgency', () => {
    expect(calculatePriority('admin', 1)).toBe(10);
    expect(calculatePriority('vice_admin', 1)).toBe(7);
    expect(calculatePriority('employee', 1)).toBe(3);
  });

  it('multiplies by urgency', () => {
    expect(calculatePriority('admin', 3)).toBe(30);
    expect(calculatePriority('employee', 3)).toBe(9);
  });

  it('defaults employee weight for unknown role', () => {
    // @ts-expect-error - testing runtime behavior
    expect(calculatePriority('unknown' as any, 1)).toBe(3);
  });
});

describe('detectUrgency', () => {
  describe('returns 3 for urgent keywords', () => {
    const urgentKeywords = ['紧急', '立刻', '马上', '急', '快', 'ASAP', 'urgent', 'immediately'];
    for (const keyword of urgentKeywords) {
      it(`"${keyword}" triggers urgency 3`, () => {
        expect(detectUrgency(`请帮我${keyword}处理`)).toBe(3);
      });
    }
  });

  it('is case-insensitive for English keywords', () => {
    expect(detectUrgency('URGENT request')).toBe(3);
    expect(detectUrgency('IMMEDIATELY needed')).toBe(3);
    expect(detectUrgency('Asap!')).toBe(3);
  });

  it('returns 1 when no urgent keyword present', () => {
    expect(detectUrgency('你好，请帮我处理')).toBe(1);
    expect(detectUrgency('这是一个普通消息')).toBe(1);
    expect(detectUrgency('')).toBe(1);
  });

  it('returns 1 for text with no urgent keywords', () => {
    // '马' alone is not in the keyword list
    expect(detectUrgency('请处理一下')).toBe(1);
  });
});

describe('enrichMessagePriority', () => {
  it('returns urgency=1 for normal message', () => {
    const result = enrichMessagePriority('admin', '普通消息');
    expect(result.urgency).toBe(1);
    expect(result.roleWeight).toBe(10);
    expect(result.priority).toBe(10);
  });

  it('returns urgency=3 for urgent message', () => {
    const result = enrichMessagePriority('vice_admin', '紧急任务，请立刻处理');
    expect(result.urgency).toBe(3);
    expect(result.roleWeight).toBe(7);
    expect(result.priority).toBe(21);
  });

  it('employee with urgent message', () => {
    const result = enrichMessagePriority('employee', '急事');
    expect(result.priority).toBe(9); // 3 * 3
  });
});

describe('shouldPreempt', () => {
  it('new priority > current * 1.5 triggers preemption', () => {
    // new=16, current=10 → 16 > 15 → true
    expect(shouldPreempt(16, 10)).toBe(true);
    // new=15, current=10 → 15 > 15 → false (not strictly greater)
    expect(shouldPreempt(15, 10)).toBe(false);
  });

  it('edge cases around 1.5x threshold', () => {
    expect(shouldPreempt(10, 7)).toBe(false); // 10 is not > 10.5
    expect(shouldPreempt(11, 7)).toBe(true);   // 11 > 10.5
  });

  it('equal priorities do not preempt', () => {
    expect(shouldPreempt(10, 10)).toBe(false);
  });

  it('lower priority never preempts', () => {
    expect(shouldPreempt(5, 10)).toBe(false);
  });
});

describe('getPriorityLevel', () => {
  it('critical: priority >= 25', () => {
    expect(getPriorityLevel(25)).toBe('critical');
    expect(getPriorityLevel(30)).toBe('critical');
    expect(getPriorityLevel(100)).toBe('critical');
  });

  it('high: priority >= 15 and < 25', () => {
    expect(getPriorityLevel(15)).toBe('high');
    expect(getPriorityLevel(20)).toBe('high');
    expect(getPriorityLevel(24)).toBe('high');
    expect(getPriorityLevel(14)).not.toBe('high');
  });

  it('medium: priority >= 7 and < 15', () => {
    expect(getPriorityLevel(7)).toBe('medium');
    expect(getPriorityLevel(10)).toBe('medium');
    expect(getPriorityLevel(14)).toBe('medium');
    expect(getPriorityLevel(6)).not.toBe('medium');
  });

  it('low: priority < 7', () => {
    expect(getPriorityLevel(6)).toBe('low');
    expect(getPriorityLevel(3)).toBe('low');
    expect(getPriorityLevel(0)).toBe('low');
  });
});

describe('getPriorityColor', () => {
  it('returns red (#ef4444) for critical (>= 25)', () => {
    expect(getPriorityColor(25)).toBe('#ef4444');
    expect(getPriorityColor(100)).toBe('#ef4444');
  });

  it('returns orange (#f97316) for high (>= 15)', () => {
    expect(getPriorityColor(15)).toBe('#f97316');
    expect(getPriorityColor(24)).toBe('#f97316');
  });

  it('returns yellow (#eab308) for medium (>= 7)', () => {
    expect(getPriorityColor(7)).toBe('#eab308');
    expect(getPriorityColor(14)).toBe('#eab308');
  });

  it('returns green (#22c55e) for low (< 7)', () => {
    expect(getPriorityColor(6)).toBe('#22c55e');
    expect(getPriorityColor(0)).toBe('#22c55e');
  });
});
