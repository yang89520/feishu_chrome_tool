// 从当前 URL 中获取 code
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

if (code && state === 'RANDOMSTRING') {
    // 将 code 发送给 background script
    chrome.runtime.sendMessage({
        action: 'oauth_callback',
        code: code
    }, () => {
        // 发送成功后关闭窗口
        window.close();
    });
} 