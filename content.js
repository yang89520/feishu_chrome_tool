// 检查是否已经初始化
if (typeof window.isContentScriptInitialized === 'undefined') {
    window.isContentScriptInitialized = true;

    // Initialize TurndownService only if it hasn't been initialized
    if (typeof window.turndownService === 'undefined') {
        window.turndownService = new TurndownService({
            headingStyle: 'atx',
            hr: '---',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced'
        });
    }

    // 确保脚本已加载完成
    console.log('Content script loaded');

    // 修改消息处理器名称，避免冲突
    const contentMessageHandler = async (request, sender, sendResponse) => {
        console.log('Content script received message:', request);
        
        try {
            switch (request.action) {
                case 'extractContent':
                    const content = document.body.innerHTML;
                    const title = document.title || 'Untitled';
                    sendResponse({
                        success: true,
                        content: content,
                        title: title
                    });
                    break;

                case 'getMarkdown':
                    const markdown = window.turndownService.turndown(request.html);
                    sendResponse({
                        success: true,
                        markdown: markdown
                    });
                    break;

                case 'uploadToFeishu':
                    // 直接转发到 background script
                    const response = await chrome.runtime.sendMessage({
                        action: 'uploadToFeishu',
                        data: {
                            fileData: request.content,
                            fileName: request.title
                        }
                    });
                    sendResponse(response);
                    break;
            }
        } catch (error) {
            console.error('Error in content script:', error);
            sendResponse({
                success: false,
                error: error.message || '未知错误'
            });
        }
    };

    // 添加监听器
    chrome.runtime.onMessage.addListener(contentMessageHandler);

    // 添加飞书文件上传功能
    window.uploadToFeishu = async function(content, title) {
        try {
            // 将内容转换为文件
            const blob = new Blob([content], { type: 'text/markdown' });
            const fileName = `${title}.md`;

            // 使用 Promise 包装消息发送
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'uploadToFeishu',
                    data: {
                        fileData: content,
                        fileName: fileName
                    }
                }, response => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    
                    if (response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error(response.error));
                    }
                });
            });
        } catch (error) {
            console.error('上传失败:', error);
            throw error;
        }
    };
}
