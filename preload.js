const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  startSession: () => ipcRenderer.invoke('start-session'),
  endSession: () => ipcRenderer.invoke('end-session'),
  saveVideo: (buffer, type) => ipcRenderer.invoke('save-video', buffer, type),
  openFolder: (dirPath) => ipcRenderer.invoke('open-folder', dirPath),
  rendererReadyToClose: () => ipcRenderer.invoke('renderer-ready-to-close'),
  onPrepareClose: (callback) => ipcRenderer.on('prepare-close', callback)
});
