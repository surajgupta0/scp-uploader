const vscode = require("vscode");
const path = require("path");
const { exec } = require("child_process");

/**
 * Upload file to remote server using SCP and change ownership.
 * @param {vscode.Uri} uri
 */
async function uploadFile(uri) {
  const filePath = uri.fsPath;
  const fileName = path.basename(filePath);

  const config = vscode.workspace.getConfiguration("scpUploader", uri);
  const servers = config.get("servers", []);
  const defaultServer = config.get("defaultServer", 0);

  if (!servers.length) {
    vscode.window.showErrorMessage("No servers defined in settings.");
    return;
  }

  const server = servers[defaultServer];
  if (!server || !server.remotePath || !server.localRootPath) {
    vscode.window.showErrorMessage("Invalid server configuration.");
    return;
  }

  // Get the path relative to the localRootPath
  const relativePath = filePath
    .replace(server.localRootPath, "")
    .replace(/\\/g, "/");
  const serverPath = path.posix.join(server.remotePath, relativePath);
  const target = `${server.user}@${server.ip}:"${serverPath}"`;

  vscode.window.showInformationMessage(
    `🚀 Uploading ${fileName} to ${target}...`
  );

  // Upload file using SCP
  const uploadCommand = `scp -r "${filePath}" ${target}`;
  exec(uploadCommand, (uploadErr, uploadStdout, uploadStderr) => {
    if (uploadErr) {
      vscode.window.showErrorMessage(
        `SCP failed: ${uploadStderr || uploadErr.message}`
      );
      return;
    }

    // Change ownership *after* file is uploaded
    const chownCommand = `ssh ${server.user}@${server.ip} "sudo chown -R ${server.user}: '${serverPath}'"`;

    exec(chownCommand, (chownErr, chownStdout, chownStderr) => {
      if (chownErr) {
        vscode.window.showWarningMessage(
          `Upload successful, but ownership change failed: ${
            chownStderr || chownErr.message
          }`
        );
        return;
      }

      vscode.window.showInformationMessage(
        `Upload successful and ownership set for: ${fileName}`
      );
    });
  });
}

module.exports = {
  uploadFile,
};
