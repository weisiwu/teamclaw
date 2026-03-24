# roles.ts — 角色与权限常量

**文件路径**: `server/src/constants/roles.ts`

---

## 职责

定义系统中的用户角色（admin / vice_admin / member）、权重体系、Agent 访问矩阵和相关辅助函数。是权限中间件（`auth.ts`、`permissionService`）的核心数据来源。

---

## 角色定义

| 角色标识     | 中文标签 | 权重 |
| ------------ | -------- | ---- |
| `admin`      | 管理员   | 10   |
| `vice_admin` | 副管理员 | 7    |
| `member`     | 普通员工 | 3    |

---

## Agent 访问矩阵（AGENT_ACCESS_MATRIX）

定义每个角色可访问的 Agent：

| 角色         | @main | @pm | @coder | @reviewer |
| ------------ | ----- | --- | ------ | --------- |
| `admin`      | ✅    | ✅  | ✅     | ✅        |
| `vice_admin` | ✅    | ✅  | ❌     | ❌        |
| `member`     | ✅    | ❌  | ❌     | ❌        |

---

## pm 交互能力（MEMBER_PM_CAPABILITIES）

定义普通成员与 pm 交互时的能力范围：

| 角色         | 能力                           |
| ------------ | ------------------------------ |
| `admin`      | `full`（完整权限）             |
| `vice_admin` | `full`                         |
| `member`     | `assistant_only`（仅助手模式） |

---

## 核心函数

### `canAccessAgent(role, agent)`

判断用户角色是否有权限与指定 Agent 交互。

```typescript
function canAccessAgent(role: Role, agent: AgentName): boolean;
```

---

### `getPmCapability(role)`

获取用户与 pm 交互时的能力范围。

```typescript
function getPmCapability(role: Role): MemberCapability;
// 'full' | 'assistant_only'
```

---

### `compareRoleWeight(roleA, roleB)`

比较两个角色权重。

```typescript
function compareRoleWeight(roleA: Role, roleB: Role): number;
// 正数：roleA 更高；负数：roleB 更高；0：相同
```

---

### `getHigherRole(role)`

获取优先级高于指定角色的下一个角色。

```typescript
function getHigherRole(role: Role): Role | null;
// admin → null（无更高）
// vice_admin → admin
// member → vice_admin
```

---

## 类型导出

```typescript
type Role = 'admin' | 'vice_admin' | 'member';
type AgentName = 'main' | 'pm' | 'coder' | 'reviewer';
type MemberCapability = 'full' | 'assistant_only';
```

---

## 变更记录

| 日期       | 变更内容                                             |
| ---------- | ---------------------------------------------------- |
| 2026-03-24 | 初始文档编写：角色定义、Agent 访问矩阵、权限辅助函数 |
