# Feishu Web Clipper

A Chrome extension that allows you to save web content to Feishu documents in Markdown format.

## Features

- Extracts main content from web pages
- Converts HTML content to Markdown format using TurnDown
- Saves content directly to Feishu documents
- Configurable Feishu app settings and folder token
- Progress tracking and status updates
- Clean and intuitive user interface

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Configuration

Before using the extension, you need to:

1. Create a Feishu application in the [Feishu Open Platform](https://open.feishu.cn/)
2. Configure the application with necessary permissions:
   - Drive API access permissions
   - File upload permissions
3. Get your App ID and App Secret from the Feishu application settings
4. Get your folder token from Feishu Drive
5. Enter the App ID, App Secret, and folder token in the extension popup

## Usage

1. Navigate to any web page you want to save
2. Click the extension icon in Chrome toolbar
3. Enter your App ID, App Secret, and folder token (if not already saved)
4. Click "Save to Feishu"
5. Wait for the content to be processed and uploaded
6. The content will be saved as a Markdown file in your specified Feishu folder

## Development

### Project Structure

- `manifest.json`: Extension configuration
- `popup.html/js`: Extension popup interface
- `content.js`: Web page content extraction
- `background.js`: Background processing and API integration
- `config.js`: Feishu API configuration
- `turndown.js`: HTML to Markdown conversion

### Required Permissions

- `activeTab`: Access current tab content
- `storage`: Save user preferences
- `scripting`: Execute content scripts
- Host permissions for Feishu API

### API Integration

The extension uses the following Feishu APIs:
- Tenant Access Token: `/open-apis/auth/v3/tenant_access_token/internal`
- File Upload: `/open-apis/drive/v1/files/upload_all`

## Todo

- [ ] Implement HTML to Markdown conversion
- [ ] Add tenant access token management
- [ ] Improve content extraction algorithm
- [ ] Add custom conversion rules
- [ ] Support batch processing
- [ ] Add more document type support

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
