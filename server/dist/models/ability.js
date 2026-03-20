export const DEFAULT_ABILITIES = [
    {
        id: 'view_docs',
        name: '查看项目文档库',
        description: '浏览项目文档库中的所有文档',
        enabled: true,
        requiredRole: 'all',
    },
    {
        id: 'view_project',
        name: '查看项目详情',
        description: '查看项目基本信息、技术栈、状态',
        enabled: true,
        requiredRole: 'all',
    },
    {
        id: 'view_tasks',
        name: '查看任务列表',
        description: '查看所有任务及其状态',
        enabled: true,
        requiredRole: 'all',
    },
    {
        id: 'view_artifacts',
        name: '查看产物列表',
        description: '查看所有构建版本和产物',
        enabled: true,
        requiredRole: 'all',
    },
    {
        id: 'download_file',
        name: '下载文件',
        description: '下载文档和构建产物',
        enabled: true,
        requiredRole: 'all',
    },
    {
        id: 'admin_config',
        name: '后台配置操作',
        description: '管理员配置系统参数、启用/禁用能力',
        enabled: true,
        requiredRole: 'admin',
    },
];
