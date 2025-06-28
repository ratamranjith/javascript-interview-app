const { app, BrowserWindow, ipcMain, autoUpdater } = require('electron');
const path = require('path');
const log = require('electron-log');

// Configure autoUpdater logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Configure update server (replace with your actual update server)
if (process.env.NODE_ENV === 'development') {
    autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml');
} else {
    autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'your-github-username',
        repo: 'your-repo-name',
        private: true, // if private repo
        token: 'your-github-token' // only needed for private repos
    });
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        frame: false,
        titleBarStyle: 'hidden',
        titleBarOverlay: true
    });

    mainWindow.loadFile('index.html');

    // Check for updates immediately
    autoUpdater.checkForUpdates();

    // Check every 24 hours
    setInterval(() => {
        autoUpdater.checkForUpdates();
    }, 86400000);

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// Auto-updater events
autoUpdater.on('update-available', () => {
    if (mainWindow) {
        mainWindow.webContents.send('update_available');
    }
});

autoUpdater.on('update-downloaded', () => {
    if (mainWindow) {
        mainWindow.webContents.send('update_downloaded');
    }
});

autoUpdater.on('error', (error) => {
    if (mainWindow) {
        mainWindow.webContents.send('update_error', error.message);
    }
});

// IPC handlers
ipcMain.on('restart_app', () => {
    autoUpdater.quitAndInstall();
});

ipcMain.on('start_update', () => {
    autoUpdater.checkForUpdates();
});

ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close();
});

// App lifecycle events
app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});