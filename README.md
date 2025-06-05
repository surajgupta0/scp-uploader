# 📤 SCP Uploader VS Code Extension

This Visual Studio Code extension allows you to **upload files or folders to a remote server using SCP**, directly from the editor. It also supports **changing remote file ownership** via SSH automatically after upload.

---

## 🚀 Features

- Upload any file or folder to your server with a right-click.
- Automatically run `chown` on the uploaded file/folder to fix ownership issues.
- Supports **multiple servers**.
- Define per-project `localRootPath` and remote `remotePath` in settings.
- Server selection support via Command Palette.

---

## 🔧 How to Use

### 1. 📁 Add Configuration in `.vscode/settings.json` (per folder/project)

```json
{
  "scpUploader.servers": [
    {
      "name": "Production Server",
      "user": "ubuntu",
      "ip": "192.168.1.100",
      "remotePath": "/var/www/html",
      "localRootPath": "c:/Users/kumar/Sites/"
    }
  ],
  "scpUploader.defaultServer": 0
}
