const vscode = require("vscode");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");

/**
 * Upload file to remote server using SCP and ensure proper permissions.
 * @param {vscode.Uri} uri
 */
async function uploadFile(uri) {
  const filePath = uri.fsPath;
  const fileName = path.basename(filePath);

  const config = vscode.workspace.getConfiguration("scpUploader", uri);
  const servers = config.get("servers", []);
  const defaultServer = config.get("defaultServer", 0);

  if (!servers.length) {
    vscode.window.showErrorMessage("❌ No servers defined in settings.");
    return;
  }

  const server = servers[defaultServer];
  if (!server || !server.remotePath || !server.localRootPath) {
    vscode.window.showErrorMessage("❌ Invalid server configuration.");
    return;
  }

  // Relative path calculation
  const relativePath = filePath
    .replace(server.localRootPath, "")
    .replace(/\\/g, "/");
  const serverPath = path.posix.join(server.remotePath, relativePath);
  const target = `${server.user}@${server.ip}:"${serverPath}"`;

  // Upload Message
  vscode.window.showInformationMessage(`Uploading ${fileName} to ${target}...`);

  // Ensure remote directory exists and chown before upload
  const remoteDir = path.posix.dirname(serverPath);
  const isDir = fs.lstatSync(filePath).isDirectory();
  const isDirFlag = isDir ? "true" : "false";
  
  const mkdirChownCommand = `
    ssh ${server.user}@${server.ip} '
    if [ ! -d "${remoteDir}" ]; then
      sudo mkdir -p "${remoteDir}" && sudo chown ${server.user}: "${remoteDir}"
    else
      sudo chown -R ${server.user}: "${remoteDir}"
    fi
    if [ ! -e "${serverPath}" ]; then
      if [[ "${isDirFlag}" == "true" ]]; then
        mkdir -p "${serverPath}"
      else
        touch "${serverPath}"
      fi
    fi
    sudo chown -R ${server.user}: "${serverPath}"
  '
  `;

  exec(mkdirChownCommand, (mkdirErr, _, mkdirStderr) => {
    if (mkdirErr) {
      vscode.window.showErrorMessage(`❌ Failed to prepare remote directory: ${mkdirStderr || mkdirErr.message}`);
      return;
    }

    // Upload file using SCP
    const uploadCommand = `scp -r "${filePath}" ${target}`;
    exec(uploadCommand, (uploadErr, _, uploadStderr) => {
      if (uploadErr) {
        vscode.window.showErrorMessage(`❌ SCP upload failed: ${uploadStderr || uploadErr.message}`);
      } else {
        vscode.window.showInformationMessage(`✅ Uploaded: ${fileName}`);
      }
    });
  });
}

async function downloadFile(uri) {
  const filePath = uri.fsPath;
  const fileName = path.basename(filePath);

  const config = vscode.workspace.getConfiguration("scpUploader", uri);
  const servers = config.get("servers", []);
  const defaultServer = config.get("defaultServer", 0);

  if (!servers.length) {
    vscode.window.showErrorMessage("❌ No servers defined in settings.");
    return;
  }

  const server = servers[defaultServer];
  if (!server || !server.remotePath || !server.localRootPath) {
    vscode.window.showErrorMessage("❌ Invalid server configuration.");
    return;
  }

  const relativePath = filePath.replace(server.localRootPath, "").replace(/\\/g, "/");
  const serverPath = path.posix.join(server.remotePath, relativePath);
  const source = `${server.user}@${server.ip}:"${serverPath}"`;

  const localDir = path.dirname(filePath);

  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  vscode.window.showInformationMessage(`Downloading ${fileName} from ${source}...`);

  const downloadCommand = `scp -r ${source} "${filePath}"`;
  exec(downloadCommand, (err, _, stderr) => {
    if (err) {
      vscode.window.showErrorMessage(`❌ SCP download failed: ${stderr || err.message}`);
    } else {
      vscode.window.showInformationMessage(`✅ Downloaded: ${fileName}`);
    }
  });
}

// Register command on activation
function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("scpUploader.upload", uploadFile),
    vscode.commands.registerCommand("scpUploader.download", downloadFile)
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
