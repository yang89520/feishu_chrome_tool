// Load dependencies
importScripts('config-loader.js');
importScripts('turndown.js');

// Initialize TurndownService
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced'
});

// Background script logic
async function getTenantAccessToken() {
  try {
    console.log('Getting tenant access token...');
    const response = await fetch(`${FEISHU_CONFIG.BASE_URL}${FEISHU_CONFIG.API_ENDPOINTS.GET_TENANT_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "app_id": FEISHU_CONFIG.APP_ID,
        "app_secret": FEISHU_CONFIG.APP_SECRET
      })
    });

    const data = await response.json();
    console.log('Tenant access token response:', data);
    return data.tenant_access_token;
  } catch (error) {
    console.error('Error getting tenant access token:', error);
    throw error;
  }
}

async function uploadToFeishu(title, content) {
  try {
    console.log('Starting upload to Feishu...');
    const tenantAccessToken = await getTenantAccessToken();
    
    const formData = new FormData();
    formData.append('file_name', `${title}.md`);
    formData.append('parent_node', FEISHU_CONFIG.PARENT_NODE);
    formData.append('file', new Blob([content], { type: 'text/markdown' }));

    const response = await fetch(`${FEISHU_CONFIG.BASE_URL}${FEISHU_CONFIG.API_ENDPOINTS.UPLOAD_FILE}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tenantAccessToken}`
      },
      body: formData
    });

    const data = await response.json();
    console.log('Upload response:', data);
    return data;
  } catch (error) {
    console.error('Error uploading to Feishu:', error);
    throw error;
  }
}

async function convertToMarkdown(html) {
  try {
    console.log('Converting HTML to Markdown...');
    const markdown = turndownService.turndown(html);
    console.log('Markdown conversion complete, length:', markdown.length);
    return markdown;
  } catch (error) {
    console.error('Error in convertToMarkdown:', error);
    throw error;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message in background script:', request);
  
  if (request.action === 'saveToFeishu') {
    (async () => {
      try {
        console.log('Converting content to markdown...');
        const markdown = await convertToMarkdown(request.content);
        
        console.log('Uploading to Feishu...');
        const response = await uploadToFeishu(request.title, markdown);
        
        console.log('Upload complete:', response);
        sendResponse({ success: true, data: response });
      } catch (error) {
        console.error('Error processing request:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Will respond asynchronously
  }
});
