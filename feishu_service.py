import requests
import json
from typing import Optional

class FeishuService:
    def __init__(self):
        self.base_url = "https://open.feishu.cn"
        self.app_access_token = None
        
    def set_credentials(self, app_id: str, app_secret: str):
        """设置应用凭证"""
        self.app_id = app_id
        self.app_secret = app_secret
    
    def get_app_access_token(self) -> str:
        """获取 app_access_token"""
        url = f"{self.base_url}/open-apis/auth/v3/app_access_token/internal"
        payload = {
            "app_id": self.app_id,
            "app_secret": self.app_secret
        }
        
        response = requests.post(url, json=payload)
        result = response.json()
        
        if result.get("code") == 0:
            self.app_access_token = result.get("app_access_token")
            return self.app_access_token
        else:
            raise Exception(f"获取app_access_token失败: {result}")

    def get_oauth_url(self, redirect_uri: str) -> str:
        """生成飞书授权链接"""
        return (f"{self.base_url}/open-apis/authen/v1/index"
                f"?app_id={self.app_id}"
                f"&redirect_uri={redirect_uri}")
    
    def get_user_access_token(self, code: str) -> dict:
        """通过授权码获取user_access_token"""
        url = f"{self.base_url}/open-apis/authen/v1/access_token"
        payload = {
            "grant_type": "authorization_code",
            "code": code
        }
        headers = {
            "Authorization": f"Bearer {self.app_access_token or self.get_app_access_token()}"
        }
        
        response = requests.post(url, json=payload, headers=headers)
        result = response.json()
        
        if result.get("code") == 0:
            return result.get("data")
        else:
            raise Exception(f"获取user_access_token失败: {result}")
    
    def refresh_user_access_token(self, refresh_token: str) -> dict:
        """刷新user_access_token"""
        url = f"{self.base_url}/open-apis/authen/v1/refresh_access_token"
        payload = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }
        headers = {
            "Authorization": f"Bearer {self.app_access_token or self.get_app_access_token()}"
        }
        
        response = requests.post(url, json=payload, headers=headers)
        result = response.json()
        
        if result.get("code") == 0:
            return result.get("data")
        else:
            raise Exception(f"刷新user_access_token失败: {result}")
    
    def upload_file(self, file_data: bytes, file_name: str, user_access_token: str) -> dict:
        """上传文件到飞书云空间"""
        url = f"{self.base_url}/open-apis/drive/v1/files/upload_all"
        
        files = {
            'file': (file_name, file_data)
        }
        headers = {
            "Authorization": f"Bearer {user_access_token}"
        }
        
        response = requests.post(url, files=files, headers=headers)
        result = response.json()
        
        if result.get("code") == 0:
            return result.get("data")
        else:
            raise Exception(f"上传文件失败: {result}") 