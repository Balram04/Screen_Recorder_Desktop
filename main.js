const { app, BrowserWindow, ipcMain, shell, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const sessionDataPath = path.join(app.getPath('temp'), 'screen-recorder-desktop-session');
const chromiumCachePath = path.join(app.getPath('temp'), 'screen-recorder-desktop-cache');
fs.mkdirSync(sessionDataPath, { recursive: true });
fs.mkdirSync(chromiumCachePath, { recursive: true });
app.setPath('sessionData', sessionDataPath);
app.commandLine.appendSwitch('disk-cache-dir', chromiumCachePath);
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

let mainWindow;
let currentDir = null;
let lastCompletedDir = null;
let isPreparingClose = false;
let canCloseWindow = false;

function createSessionDirectory() {
  const id = uuidv4();
  currentDir = path.join(__dirname, 'videos', id);
  fs.mkdirSync(currentDir, { recursive: true });
  return currentDir;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('close', (event) => {
    if (canCloseWindow || isPreparingClose) {
      return;
    }

    event.preventDefault();
    isPreparingClose = true;
    mainWindow.webContents.send('prepare-close');

    setTimeout(() => {
      if (!canCloseWindow && mainWindow && !mainWindow.isDestroyed()) {
        canCloseWindow = true;
        mainWindow.close();
      }
    }, 5000);
  });
}

app.whenReady().then(createWindow);

// Get available screen and window sources
ipcMain.handle('get-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window']
  });

  return sources.map(source => ({
    id: source.id,
    name: source.name
  }));
});

// Create new session folder
ipcMain.handle('start-session', () => {
  if (currentDir) {
    return currentDir;
  }

  return createSessionDirectory();
});

// Mark session complete so next recording starts in a fresh UUID directory
ipcMain.handle('end-session', () => {
  if (currentDir) {
    lastCompletedDir = currentDir;
    currentDir = null;
  }

  return lastCompletedDir;
});

// Save video file
ipcMain.handle('save-video', (event, buffer, type) => {
  if (!currentDir) {
    throw new Error('No active recording session.');
  }

  if (type !== 'screen' && type !== 'webcam') {
    throw new Error('Invalid recording type.');
  }

  const safeBuffer = Buffer.from(buffer);
  const filePath = path.join(currentDir, `${type}.webm`);
  fs.writeFileSync(filePath, safeBuffer);
  return filePath;
});

// Open folder
ipcMain.handle('open-folder', (event, dirPath) => {
  const targetPath = dirPath || currentDir || lastCompletedDir;

  if (!targetPath || !fs.existsSync(targetPath)) {
    return false;
  }

  shell.openPath(targetPath);
  return true;
});

ipcMain.handle('renderer-ready-to-close', () => {
  canCloseWindow = true;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }

  return true;
});