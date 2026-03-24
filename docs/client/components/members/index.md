# 成员管理组件 (members)

## 目录

`components/members/`

| 组件       | 说明         |
| ---------- | ------------ |
| MemberForm | 成员信息表单 |

## MemberForm

添加/编辑项目成员表单。

| 属性     | 类型                             | 说明               |
| -------- | -------------------------------- | ------------------ |
| member   | `Member`                         | 成员数据（编辑时） |
| onSubmit | `(data: MemberFormData) => void` | 提交回调           |
| onCancel | `() => void`                     | 取消回调           |

### 表单字段

- 用户搜索/选择
- 角色选择（owner/member/viewer）
- 权限配置

## 使用示例

```tsx
<MemberForm onSubmit={handleSubmit} onCancel={handleCancel} />
```
