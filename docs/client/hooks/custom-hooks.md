# 自定义 Hooks 文档

> `lib/hooks/` 目录下不依赖 React Query 的自定义 Hooks

## 目录

- [useAuth](#useauth)
- [useDownloadHistory](#usedownloadhistory)
- [useDownloadProgress](#usedownloadprogress)

---

## `useAuth`

**文件**：`lib/hooks/useAuth.ts`

认证状态管理 Hook，提供用户登录状态检查和路由保护能力。

### 函数签名

```ts
function useAuth(): {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  checkPermission: (permission: string) => boolean;
}
```

### 类型定义

```ts
interface AuthUser {
  id: string;
  name: string;
  email?: string;
  role: 'admin' | 'sub_admin' | 'member';
  avatar?: string;
}

interface LoginCredentials {
  username: string;
  password: string;
}
```

### 使用示例

```tsx
'use client';
import { useAuth } from 'lib/hooks/useAuth';

// 保护页面
export default function ProtectedPage() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <Spinner />;

  if (!isAuthenticated) {
    return <SignInPrompt />;
  }

  return (
    <div>
      欢迎, {user?.name}（{user?.role}）
    </div>
  );
}

// 权限检查
function AdminPanel() {
  const { checkPermission } = useAuth();

  if (!checkPermission('admin:write')) {
    return <AccessDenied />;
  }

  return <AdminContent />;
}
```

### 内部逻辑

- 登录状态存储在 `localStorage` 或 Cookie
- 首次渲染时异步验证 Token 有效性
- `checkPermission(permission)` 根据用户角色判断是否有权限
- `logout()` 清除本地认证数据并重定向到登录页

---

## `useDownloadHistory`

**文件**：`lib/hooks/useDownloadHistory.ts`

管理下载历史记录，基于 `localStorage` 持久化，无需网络请求。

### 函数签名

```ts
function useDownloadHistory(): {
  records: DownloadRecord[];
  addRecord: (params: AddRecordParams) => void;
  removeRecord: (id: string) => void;
  clearHistory: () => void;
  getRecordsByVersion: (versionId: string) => DownloadRecord[];
}
```

### 类型定义

```ts
interface DownloadRecord {
  id: string;                     // 自动生成的唯一 ID
  versionId: string;              // 关联版本 ID
  versionName: string;            // 版本名称
  artifactName: string;           // 产物名称
  artifactPath: string;           // 下载路径
  fileSize: number;              // 文件大小（字节）
  fileSizeFormatted: string;      // 格式化大小（如 "12.5 MB"）
  downloadedAt: string;            // 下载时间（ISO 8601）
}

interface AddRecordParams {
  versionId: string;
  versionName: string;
  artifactName: string;
  artifactPath: string;
  fileSize?: number;              // 可选，不提供则显示 "0 B"
}
```

### 使用示例

```tsx
'use client';
import { useDownloadHistory } from 'lib/hooks/useDownloadHistory';

function DownloadHistory() {
  const { records, removeRecord, clearHistory, getRecordsByVersion } = useDownloadHistory();

  return (
    <div>
      <h2>下载历史</h2>

      {/* 按版本过滤 */}
      <h3>v1.2.0 的下载记录</h3>
      <ul>
        {getRecordsByVersion('v_xxx').map(record => (
          <li key={record.id}>
            {record.artifactName} — {record.fileSizeFormatted}
            <button onClick={() => removeRecord(record.id)}>删除</button>
          </li>
        ))}
      </ul>

      {/* 全部历史 */}
      <h3>全部历史（共 {records.length} 条）</h3>
      <ul>
        {records.map(record => (
          <li key={record.id}>
            {record.versionName} / {record.artifactName}
            {' — '}{record.fileSizeFormatted}
            {' — '}{new Date(record.downloadedAt).toLocaleDateString()}
          </li>
        ))}
      </ul>

      <button onClick={clearHistory}>清空历史</button>
    </div>
  );
}
```

### 自动格式化

文件大小自动格式化：

| 字节数 | 显示 |
|---|---|
| 0 | `0 B` |
| 1024 | `1.0 KB` |
| 1536 | `1.5 KB` |
| 1048576 | `1.0 MB` |
| 1073741824 | `1.0 GB` |

### 存储限制

- 最多保留 **50 条**记录（超出时自动删除最旧的）
- 存储键名：`teamclaw_download_history`
- SSR 环境下自动跳过（`typeof window === 'undefined'` 时返回空数组）

---

## `useDownloadProgress`

**文件**：`lib/hooks/useDownloadProgress.ts`

实时订阅下载进度，基于 WebSocket 事件推送。组件卸载时自动取消订阅。

### 函数签名

```ts
function useDownloadProgress(
  taskId: string | null,
  options?: UseDownloadProgressOptions
): {
  progress: number;        // 0-100，进度百分比
  status: string;         // 'pending' | 'downloading' | 'completed' | 'error'
  speed: number;          // 实时下载速度（字节/秒）
  eta: number;            // 预计剩余时间（秒）
  error: Error | null;    // 错误信息（若有）
  isComplete: boolean;    // 是否已完成
  reset: () => void;      // 重置所有状态
}

interface UseDownloadProgressOptions {
  onProgress?: (event: DownloadProgressEvent) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}
```

### 类型定义

```ts
interface DownloadProgressEvent {
  taskId: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  progress: number;       // 0-100
  downloaded: number;     // 已下载字节
  total: number;          // 总字节
  speed: number;          // 字节/秒
  eta: number;            // 剩余秒数
  error?: string;
}
```

### 使用示例

```tsx
'use client';
import { useDownloadProgress } from 'lib/hooks/useDownloadProgress';
import { createDownloadTask } from 'lib/api/download';

function DownloadButton({ versionId }: { versionId: string }) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const { progress, status, speed, eta, isComplete, error, reset } =
    useDownloadProgress(taskId, {
      onComplete: () => {
        alert('下载完成！');
      },
      onError: (err) => {
        alert('下载失败: ' + err.message);
      },
    });

  const handleDownload = async () => {
    const result = await createDownloadTask({ fileIds: [versionId] });
    setTaskId(result.taskId);
  };

  return (
    <div>
      <button onClick={handleDownload} disabled={taskId !== null && !isComplete}>
        {isComplete ? '下载完成' : '开始下载'}
      </button>

      {/* 下载中显示进度 */}
      {taskId && !isComplete && (
        <div>
          <progress value={progress} max={100} />
          <span>{progress.toFixed(1)}%</span>
          <span>速度: {(speed / 1024 / 1024).toFixed(1)} MB/s</span>
          <span>剩余: {Math.ceil(eta)}s</span>
          {error && <span style={{ color: 'red' }}>错误: {error.message}</span>}
        </div>
      )}
    </div>
  );
}
```

### 行为说明

| 场景 | 行为 |
|---|---|
| `taskId` 为 `null` | 重置所有状态，不订阅任何事件 |
| `taskId` 变化（新 ID） | 自动取消旧订阅，建立新订阅 |
| 组件卸载 | 自动取消订阅（cleanup） |
| WebSocket 连接失败 | 触发 `onError` 回调，`error` 状态更新 |
| 下载完成（`status === 'completed'`） | 设置 `isComplete: true`，触发 `onComplete` 回调 |

### 进度计算说明

- `progress`：0-100 的百分比（`downloaded / total * 100`）
- `speed`：实时速率（字节/秒），由后端推送
- `eta`：预计剩余时间（秒），由后端推送或本地计算

### 与 `createDownloadTask` 配合使用

```ts
import { createDownloadTask } from 'lib/api/download';
import { useDownloadProgress } from 'lib/hooks/useDownloadProgress';

// 1. 调用 API 创建下载任务，获得 taskId
const { taskId } = await createDownloadTask({ fileIds: ['artifact_xxx'] });

// 2. 将 taskId 传入 useDownloadProgress
const progress = useDownloadProgress(taskId);

// 3. 下载完成后可通过 taskId 查询最终文件 URL
```
