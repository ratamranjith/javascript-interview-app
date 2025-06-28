const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')
const updater = require('./updater')

let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        frame: false,
        titleBarStyle: 'hidden',
        icon: path.join(__dirname, '../../assets/icons/icon.png')
    })

    // In main.js before app.whenReady()
    if (process.env.NODE_ENV === 'development') {
        autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml')
    }
    if (!app.isPackaged) {
        mainWindow.webContents.openDevTools()
    }

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))

    // Open dev tools if in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools()
    }

    // Set up auto-updater
    updater.checkForUpdates(mainWindow)

    // Window control handlers
    ipcMain.on('minimize-window', () => mainWindow.minimize())
    ipcMain.on('maximize-window', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize()
        } else {
            mainWindow.maximize()
        }
    })
    ipcMain.on('close-window', () => mainWindow.close())
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})