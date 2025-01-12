import { FEISHU_CONFIG } from './config.js';

document.addEventListener('DOMContentLoaded', function() {
  const saveButton = document.getElementById('saveButton');
  const status = document.getElementById('status');

  // 防止重复点击
  let isProcessing = false;

  async function injectContentScripts(tabId) {
    try {
        // 先检查脚本是否已经注入
        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => typeof window.isContentScriptInitialized !== "undefined"
        });

        if (!result) {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['turndown.js', 'content.js']
            });
            // 等待脚本初始化
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (error) {
        console.error('Scripts injection error:', error);
        throw error;
    }
  }

  async function handleExtract() {
    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('No active tab found');
      }

      // 确保脚本已注入
      await injectContentScripts(tab.id);

      // 发送消息到 content script
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'extractContent' 
      });

      if (response.success) {
        console.log('Content extracted successfully');
        return response;
      } else {
        throw new Error(response.error || 'Failed to extract content');
      }
    } catch (error) {
      console.error('Error in handleExtract:', error);
      throw error;
    }
  }

  async function uploadToFeishu(content, title) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            throw new Error('No active tab found');
        }

        await injectContentScripts(tab.id);

        // 直接发送消息到 background script
        const response = await chrome.runtime.sendMessage({
            action: 'uploadToFeishu',
            data: {
                fileData: content,
                fileName: `${title}.md`
            }
        });

        if (!response?.success) {
            throw new Error(response?.error || '上传失败');
        }

        return response.data;
    } catch (error) {
        console.error('Error in uploadToFeishu:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            error: error
        });
        throw error;
    }
  }

  // 在上传成功后显示成功消息并自动关闭 popup
  function showSuccessAndClose() {
    const status = document.getElementById('status');
    status.textContent = '上传成功！';
    status.style.color = 'green';
    // 延迟 1.5 秒后关闭 popup
    setTimeout(() => {
        window.close();
    }, 1500);
  }

  // 在发生错误时显示错误消息
  function showError(error) {
    const status = document.getElementById('status');
    let errorMessage;

    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else if (error && typeof error === 'object') {
        errorMessage = error.message || JSON.stringify(error);
    } else {
        errorMessage = '发生未知错误';
    }

    status.textContent = `错误: ${errorMessage}`;
    status.style.color = 'red';
    
    // 记录详细错误信息
    console.error('Error details:', {
        error,
        processedMessage: errorMessage,
        stack: error?.stack
    });
  }

  // 修改上传处理函数
  async function handleUpload() {
    try {
        const saveButton = document.getElementById('saveButton');
        const status = document.getElementById('status');
        
        saveButton.disabled = true;
        status.textContent = '正在处理...';
        
        // 获取内容
        const contentResponse = await handleExtract();
        status.textContent = '正在转换格式...';
        
        // 转换为 Markdown
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.tabs.sendMessage(tab.id, { 
            action: 'getMarkdown',
            html: contentResponse.content
        });

        if (!response?.success) {
            throw new Error(response?.error || 'Markdown 转换失败');
        }

        status.textContent = '正在上传到飞书...';
        // 上传到飞书
        await uploadToFeishu(response.markdown, contentResponse.title);
        
        showSuccessAndClose();
    } catch (error) {
        console.error('Upload failed:', error);
        showError(error);
    }
  }

  saveButton.addEventListener('click', async () => {
    if (isProcessing) {
        console.log('正在处理中，请等待...');
        return;
    }

    try {
        isProcessing = true;
        await handleUpload(); // 使用统一的处理函数
    } catch (error) {
        console.error('Operation failed:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            error: error
        });
        showError(error);
    } finally {
        isProcessing = false;
        saveButton.disabled = false;
    }
  });
});
