import { FeishuService } from './feishu_service.js';
import { FEISHU_CONFIG } from './config.js';

// 初始化飞书服务
const feishuService = new FeishuService();
feishuService.setCredentials(FEISHU_CONFIG.APP_ID, FEISHU_CONFIG.APP_SECRET);

// 移除之前的所有请求拦截器和事件监听器
// 只保留核心的请求方法
async function makeRequest(url, options) {
    try {
        // 1. 准备请求配置
        const requestOptions = {
            method: options.method || 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'no-cors'  // 关键：使用 no-cors 模式
        };

        // 2. 处理认证头
        if (options.headers?.Authorization) {
            requestOptions.headers.Authorization = options.headers.Authorization;
        }

        // 3. 处理请求体
        if (options.body) {
            if (options.body instanceof FormData) {
                requestOptions.body = options.body;
                delete requestOptions.headers['Content-Type']; // 让浏览器自动设置
            } else {
                requestOptions.body = typeof options.body === 'string' 
                    ? options.body 
                    : JSON.stringify(options.body);
            }
        }

        // 4. 发送请求
        const response = await fetch(url, requestOptions);

        // 5. 特殊处理 no-cors 响应
        if (response.type === 'opaque') {
            // 对于 no-cors 响应，我们假设请求成功
            return { code: 0, data: null };
        }

        // 6. 处理正常响应
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('请求失败:', error);
        throw error;
    }
}

// 修改 FeishuService 的 makeRequest 方法
feishuService.makeRequest = makeRequest;

// 错误处理函数
function handleApiError(error) {
    console.error('API 请求失败:', error);
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        return {
            success: false,
            error: '网络连接失败，请检查网络设置'
        };
    }
    
    if (error.response) {
        return {
            success: false,
            error: `服务器错误 (${error.response.status}): ${error.response.statusText}`
        };
    }
    
    return {
        success: false,
        error: error.message || '未知错误'
    };
}

// 修改消息处理器名称，避免冲突
const backgroundMessageHandler = (request, sender, sendResponse) => {
    console.group('处理消息');
    console.log('收到消息:', request);
    
    if (request.action === 'uploadToFeishu') {
        if (request.isProcessing) {
            console.log('消息正在处理中，跳过');
            console.groupEnd();
            sendResponse({ success: false, error: '请求正在处理中' });
            return;
        }
        request.isProcessing = true;

        // 使用 async/await 处理上传
        (async () => {
            try {
                const result = await handleFeishuUpload(request.data);
                console.log('上传成功:', result);
                sendResponse({ success: true, data: result });
            } catch (error) {
                console.error('上传失败:', error);
                sendResponse(handleApiError(error));
            } finally {
                request.isProcessing = false;
                console.groupEnd();
            }
        })();

        return true; // 保持消息通道开启
    }
    console.groupEnd();
};

// 移除现有的监听器（如果存在）
chrome.runtime.onMessage.removeListener(backgroundMessageHandler);
// 添加新的监听器
chrome.runtime.onMessage.addListener(backgroundMessageHandler);

// 添加一个 Promise 来处理授权码
let authCodePromiseResolve = null;
let authCodePromise = null;

async function getAuthCode() {
    try {
        const authUrl = feishuService.getOAuthUrl();
        console.log('授权 URL:', authUrl);

        // 创建新的 Promise
        authCodePromise = new Promise((resolve) => {
            authCodePromiseResolve = resolve;
        });

        // 打开授权窗口
        const authWindow = await chrome.windows.create({
            url: authUrl,
            type: 'popup',
            width: 800,
            height: 600
        });

        // 监听 URL 变化
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
            if (changeInfo.url && changeInfo.url.includes('open.feishu.cn/api-explorer/loading')) {
                const url = new URL(changeInfo.url);
                const code = url.searchParams.get('code');
                if (code) {
                    // 移除监听器
                    chrome.tabs.onUpdated.removeListener(listener);
                    // 关闭授权窗口
                    chrome.windows.remove(authWindow.id);
                    // 解析 Promise
                    authCodePromiseResolve(code);
                }
            }
        });

        // 等待授权码
        const code = await authCodePromise;
        authCodePromise = null;
        authCodePromiseResolve = null;

        return code;
    } catch (error) {
        console.error('获取授权码失败:', error);
        throw error;
    }
}

// 添加消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'oauth_callback' && authCodePromiseResolve) {
        // 收到授权码，解析 Promise
        authCodePromiseResolve(request.code);
        sendResponse({ success: true });
    }
});

// 修改文件上传处理函数
async function handleFeishuUpload(data) {
    try {
        console.group('处理文件上传');
        console.log('获取应用凭证...');
        
        // 获取 app_access_token
        const appToken = await feishuService.getAppAccessToken();
        console.log('获取到 app_access_token:', appToken);

        console.log('等待用户授权...');
        // 获取授权码
        const code = await getAuthCode();
        console.log('获取到授权码:', code);

        console.log('获取用户凭证...');
        // 使用授权码获取 user_access_token
        const tokenData = await feishuService.getUserAccessToken(appToken, code);
        console.log('获取到 token 数据:', tokenData);
        
        console.log('准备上传文件...');
        // 创建文件 blob
        const blob = new Blob([data.fileData], { type: 'text/markdown' });
        
        console.log('正在上传...');
        // 上传文件
        const result = await feishuService.uploadFile(
            blob,
            data.fileName,
            tokenData.access_token,
            FEISHU_CONFIG.PARENT_NODE
        );

        console.log('上传完成:', result);
        console.groupEnd();
        return result;
    } catch (error) {
        console.error('上传失败:', error);
        console.groupEnd();
        throw error;
    }
}

// 修改 Service Worker 的 fetch 事件处理
self.addEventListener('fetch', event => {
    if (event.request.url.includes('open.feishu.cn')) {
        // 不拦截这些请求，让 makeRequest 处理它们
        return;
    }
});

