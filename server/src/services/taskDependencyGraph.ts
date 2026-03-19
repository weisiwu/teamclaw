/**
 * Task Dependency Graph Service
 * 任务依赖图服务 - DAG可视化/循环检测/拓扑排序/关键路径
 * iter-23 enhancement over iter-13 taskFlow
 */

import { taskStore } from './taskLifecycle.js';

// ============ 类型定义 ============

export interface DAGNode {
  taskId: string;
  title: string;
  status: string;
  depth: number;          // 在DAG中的深度（从根节点算起）
  dependents: string[];   // 依赖此节点的任务（反向引用）
  rank: number;           // 拓扑排序的层级
  isCyclic: boolean;      // 是否在循环中
}

export interface DAGEdge {
  from: string;   // 依赖任务
  to: string;     // 被依赖任务（from完成后to才能开始）
  type: 'dependency' | 'blocking';
}

export interface DAGResult {
  nodes: DAGNode[];
  edges: DAGEdge[];
  hasCycle: boolean;
  cycleNodes: string[];    // 循环中的任务ID
  topologicalOrder: string[];
  criticalPath: string[];  // 关键路径（最长路径）
  maxDepth: number;
}

export interface SubtaskTree {
  taskId: string;
  title: string;
  status: string;
  children: SubtaskTree[];
  depth: number;
}

// ============ 依赖图构建 ============

/**
 * 为指定任务构建DAG（包含其所有依赖和被依赖任务）
 */
export function buildDAG(taskId: string): DAGResult {
  const allTaskIds = new Set<string>();
  const visited = new Set<string>();
  const visiting = new Set<string>();

  // BFS收集所有相关任务（依赖树 + 被依赖树）
  function collect(taskId: string) {
    if (visited.has(taskId)) return;
    if (visiting.has(taskId)) return; // 避免在BFS阶段重复
    visiting.add(taskId);
    allTaskIds.add(taskId);

    const task = taskStore.get(taskId);
    if (!task) return;

    // 收集依赖
    for (const dep of task.dependsOn) {
      allTaskIds.add(dep);
      collect(dep);
    }
    // 收集被依赖（blockingTasks）
    for (const blocked of task.blockingTasks) {
      allTaskIds.add(blocked);
      collect(blocked);
    }
    // 收集父子
    if (task.parentTaskId) {
      allTaskIds.add(task.parentTaskId);
      collect(task.parentTaskId);
    }
    for (const child of task.subtaskIds) {
      allTaskIds.add(child);
      collect(child);
    }

    visiting.delete(taskId);
    visited.add(taskId);
  }

  collect(taskId);

  // 构建边列表
  const edges: DAGEdge[] = [];
  const cyclicNodes = new Set<string>();

  for (const tid of allTaskIds) {
    const task = taskStore.get(tid);
    if (!task) continue;

    for (const dep of task.dependsOn) {
      if (allTaskIds.has(dep)) {
        edges.push({ from: dep, to: tid, type: 'dependency' });
      }
    }
    for (const blocked of task.blockingTasks) {
      if (allTaskIds.has(blocked)) {
        edges.push({ from: blocked, to: tid, type: 'blocking' });
      }
    }
  }

  // 检测循环（DFS着色法）
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const tid of allTaskIds) color.set(tid, WHITE);

  function dfsCycle(nodeId: string): boolean {
    color.set(nodeId, GRAY);
    const task = taskStore.get(nodeId);
    if (!task) { color.set(nodeId, BLACK); return false; }

    for (const dep of task.dependsOn) {
      if (!allTaskIds.has(dep)) continue;
      if (color.get(dep) === GRAY) {
        // 找到循环
        cyclicNodes.add(nodeId);
        cyclicNodes.add(dep);
        return true;
      }
      if (color.get(dep) === WHITE) {
        if (dfsCycle(dep)) {
          cyclicNodes.add(nodeId);
          return true;
        }
      }
    }
    color.set(nodeId, BLACK);
    return false;
  }

  for (const tid of allTaskIds) {
    if (color.get(tid) === WHITE) dfsCycle(tid);
  }

  // 拓扑排序（Kahn算法）
  const inDegree = new Map<string, number>();
  for (const tid of allTaskIds) inDegree.set(tid, 0);
  for (const edge of edges) {
    if (edge.type === 'dependency') {
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [tid, degree] of inDegree) {
    if (degree === 0) queue.push(tid);
  }

  const topologicalOrder: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    topologicalOrder.push(current);
    const task = taskStore.get(current);
    if (!task) continue;
    for (const dep of task.dependsOn) {
      if (!allTaskIds.has(dep)) continue;
      inDegree.set(dep, (inDegree.get(dep) ?? 0) - 1);
      if (inDegree.get(dep) === 0) queue.push(dep);
    }
  }

  // 深度计算（BFS从根节点）
  const depthMap = new Map<string, number>();
  const roots = topologicalOrder.filter(tid => {
    const task = taskStore.get(tid);
    return task && (task.dependsOn.length === 0 || task.dependsOn.every(d => !allTaskIds.has(d)));
  });
  for (const tid of roots) depthMap.set(tid, 0);
  for (const tid of topologicalOrder) {
    const task = taskStore.get(tid);
    if (!task) continue;
    const baseDepth = depthMap.get(tid) ?? 0;
    for (const child of task.subtaskIds) {
      if (allTaskIds.has(child)) {
        depthMap.set(child, Math.max(depthMap.get(child) ?? 0, baseDepth + 1));
      }
    }
    for (const blocked of task.blockingTasks) {
      if (allTaskIds.has(blocked)) {
        depthMap.set(blocked, Math.max(depthMap.get(blocked) ?? 0, baseDepth + 1));
      }
    }
  }

  // 关键路径（最长路径 - 从pending状态任务到终点）
  function longestPath(): string[] {
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    for (const tid of allTaskIds) { dist.set(tid, 0); prev.set(tid, null); }

    // 按拓扑序更新距离
    for (const tid of topologicalOrder) {
      const task = taskStore.get(tid);
      if (!task) continue;
      const d = dist.get(tid) ?? 0;
      for (const blocked of task.blockingTasks) {
        if (!allTaskIds.has(blocked)) continue;
        if (d + 1 > (dist.get(blocked) ?? 0)) {
          dist.set(blocked, d + 1);
          prev.set(blocked, tid);
        }
      }
    }

    // 找最长终点
    let maxDist = 0, endNode: string | null = null;
    for (const [tid, d] of dist) {
      if (d > maxDist) { maxDist = d; endNode = tid; }
    }

    // 回溯
    const path: string[] = [];
    while (endNode) { path.unshift(endNode); endNode = prev.get(endNode) ?? null; }
    return path;
  }

  const criticalPath = longestPath();

  // 构建节点列表
  const nodes: DAGNode[] = [];
  for (const tid of allTaskIds) {
    const task = taskStore.get(tid);
    if (!task) continue;
    // dependents = 所有依赖此任务的任务
    const dependents = [...new Set([
      ...edges.filter(e => e.from === tid && e.type === 'dependency').map(e => e.to),
      ...task.blockingTasks.filter(bt => allTaskIds.has(bt)),
    ])];
    nodes.push({
      taskId: tid,
      title: task.title,
      status: task.status,
      depth: depthMap.get(tid) ?? 0,
      dependents,
      rank: topologicalOrder.indexOf(tid),
      isCyclic: cyclicNodes.has(tid),
    });
  }

  return {
    nodes,
    edges,
    hasCycle: cyclicNodes.size > 0,
    cycleNodes: [...cyclicNodes],
    topologicalOrder,
    criticalPath,
    maxDepth: Math.max(0, ...[...depthMap.values()]),
  };
}

// ============ 子任务树 ============

export function buildSubtaskTree(taskId: string, maxDepth = 5): SubtaskTree | null {
  const task = taskStore.get(taskId);
  if (!task) return null;

  function build(nodeId: string, depth: number): SubtaskTree {
    const t = taskStore.get(nodeId)!;
    return {
      taskId: nodeId,
      title: t.title,
      status: t.status,
      depth,
      children: depth < maxDepth
        ? t.subtaskIds.map(childId => build(childId, depth + 1))
        : [],
    };
  }

  return build(taskId, 0);
}

// ============ 可运行任务检测 ============

export function getRunnableTasks(): string[] {
  const runnable: string[] = [];
  for (const [taskId, task] of taskStore.entries()) {
    if (task.status !== 'pending') continue;
    // 检查所有依赖是否已完成
    const allDepsDone = task.dependsOn.every(depId => {
      const dep = taskStore.get(depId);
      return dep && (dep.status === 'done');
    });
    if (allDepsDone) runnable.push(taskId);
  }
  return runnable;
}

// ============ 依赖冲突检测 ============

export interface DependencyConflict {
  taskA: string;
  taskB: string;
  reason: string;
}

export function detectDependencyConflicts(taskId: string): DependencyConflict[] {
  const conflicts: DependencyConflict[] = [];
  const task = taskStore.get(taskId);
  if (!task) return conflicts;

  // 检测循环依赖
  const visited = new Set<string>();
  function hasCycle(currentId: string, path: Set<string>): boolean {
    if (path.has(currentId)) return true;
    if (visited.has(currentId)) return false;
    visited.add(currentId);
    path.add(currentId);
    const t = taskStore.get(currentId);
    if (!t) return false;
    for (const dep of t.dependsOn) {
      if (hasCycle(dep, new Set(path))) return true;
    }
    return false;
  }

  for (const depId of task.dependsOn) {
    if (hasCycle(depId, new Set([taskId]))) {
      conflicts.push({
        taskA: taskId,
        taskB: depId,
        reason: '添加此依赖会造成循环依赖',
      });
    }
  }

  return conflicts;
}
