// Feishu API configuration
export const FEISHU_CONFIG = {
    APP_ID: 'cli_a6fce2cc8ebd1013',
    APP_SECRET: '1SB8VlZ6Yb74bfb2DNqPRbsWRydzPtBC',
    PARENT_NODE: 'AfvOf7oZ5ldOBhdW46XclRUVnlb', // 可选：指定上传文件夹的 token
    REDIRECT_URI: 'https://open.feishu.cn/api-explorer/loading', // 使用飞书开放平台配置的重定向 URI
    SCOPE: 'drive:file:upload offline_access', // 授权范围：文件上传和离线访问
    STATE: 'RANDOMSTRING' // 用于防止 CSRF 攻击的随机字符串
};
