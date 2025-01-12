import { FEISHU_CONFIG } from './config.js';

export class FeishuService {
    constructor() {
        this.baseUrl = "https://open.feishu.cn";
        this.appAccessToken = null;
    }

    setCredentials(appId, appSecret) {
        this.appId = appId;
        this.appSecret = appSecret;
    }

    async makeRequest(url, options) {
        throw new Error('makeRequest not implemented');
    }

    async getAppAccessToken() {
        console.group('获取 app_access_token');
        try {
            const result = await this.makeRequest(
                `${this.baseUrl}/open-apis/auth/v3/app_access_token/internal`,
                {
                    method: 'POST',
                    body: {
                        app_id: this.appId,
                        app_secret: this.appSecret
                    }
                }
            );

            if (result.code === 0) {
                this.appAccessToken = result.app_access_token;
                return this.appAccessToken;
            }
            throw new Error(`获取app_access_token失败: ${JSON.stringify(result)}`);
        } catch (error) {
            console.error('错误:', error);
            throw error;
        } finally {
            console.groupEnd();
        }
    }

    async getUserAccessToken(appAccessToken, code) {
        try {
            const result = await this.makeRequest(
                `${this.baseUrl}/open-apis/authen/v1/access_token`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${appAccessToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        grant_type: "authorization_code",
                        code: code
                    })
                }
            );
            
            if (result.code === 0) {
                console.log("userAccessToken", result.data);
                const refreshedTokenData = await this.refreshUserAccessToken(result.data.access_token, result.data.refresh_token);
                return refreshedTokenData;
            } else {
                throw new Error(`获取user_access_token失败: ${JSON.stringify(result)}`);
            }
        } catch (error) {
            throw new Error(`获取user_access_token请求失败: ${error.message}`);
        }
    }

    async refreshUserAccessToken(userAccessToken, refreshToken) {
        try {
            const result = await this.makeRequest(
                `${this.baseUrl}/open-apis/authen/v1/refresh_access_token`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${userAccessToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        grant_type: "refresh_token",
                        refresh_token: refreshToken
                    })
                }
            );

            if (result.code === 0) {
                console.log("refreshedToken", result.data);
                return result.data;
            } else {
                throw new Error(`刷新user_access_token失败: ${JSON.stringify(result)}`);
            }
        } catch (error) {
            throw new Error(`刷新user_access_token请求失败: ${error.message}`);
        }
    }

    async uploadFile(fileData, fileName, userAccessToken, parentNode = "") {
        try {
            const formData = new FormData();
            const blob = new Blob([fileData], { type: 'text/markdown' });
            
            formData.append('file_name', fileName);
            formData.append('parent_type', 'explorer');
            if (parentNode) {
                formData.append('parent_node', parentNode);
            }
            formData.append('size', blob.size.toString());
            formData.append('file', blob, fileName);

            const result = await this.makeRequest(
                `${this.baseUrl}/open-apis/drive/v1/files/upload_all`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${userAccessToken}`,
                        'Accept': 'application/json'
                    },
                    body: formData
                }
            );

            if (result.code === 0) {
                return result.data;
            } else {
                throw new Error(`上传文件失败: ${JSON.stringify(result)}`);
            }
        } catch (error) {
            throw new Error(`上传文件请求失败: ${error.message}`);
        }
    }

    getOAuthUrl() {
        const url = new URL(`${this.baseUrl}/open-apis/authen/v1/index`);
        url.searchParams.append('client_id', this.appId);
        url.searchParams.append('redirect_uri', FEISHU_CONFIG.REDIRECT_URI);
        url.searchParams.append('scope', FEISHU_CONFIG.SCOPE);
        url.searchParams.append('state', FEISHU_CONFIG.STATE);
        console.log("url", url.toString());
        return url.toString();
    }
} 