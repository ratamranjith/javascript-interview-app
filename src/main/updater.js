const { autoUpdater } = require('electron-updater')
const { ipcMain, dialog } = require('electron')

module.exports = {
    checkForUpdates: (mainWindow) => {
        autoUpdater.autoDownload = false
        autoUpdater.allowPrerelease = false // Set to true if using pre-releases

        // Configure logger
        autoUpdater.logger = require('electron-log')
        autoUpdater.logger.transports.file.level = 'info'

        autoUpdater.on('update-available', (info) => {
            mainWindow.webContents.send('update_available', info)
        })

        autoUpdater.on('update-downloaded', (info) => {
            mainWindow.webContents.send('update_downloaded', info)
        })

        autoUpdater.on('error', (error) => {
            console.error('Update error:', error)
            // Only send to renderer if window exists
            if (!mainWindow.isDestroyed()) {
                mainWindow.webContents.send('update_error', error.message)
            }

            // Additional fallback notification
            if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
                dialog.showErrorBox(
                    'Update Error',
                    'Could not connect to update server. Please check your internet connection.'
                )
            }
        })

        autoUpdater.on('download-progress', (progress) => {
            mainWindow.webContents.send('download_progress', progress)
        })

        ipcMain.on('start_update', () => {
            autoUpdater.downloadUpdate().catch(err => {
                mainWindow.webContents.send('update_error', err.message)
            })
        })

        ipcMain.on('restart_app', () => {
            autoUpdater.quitAndInstall(true, true)
        })

        // Check for updates with retry logic
        const checkWithRetry = (retries = 3, delay = 5000) => {
            autoUpdater.checkForUpdates().catch(err => {
                if (retries > 0) {
                    console.log(`Retrying update check... (${retries} left)`)
                    setTimeout(() => checkWithRetry(retries - 1, delay), delay)
                } else {
                    mainWindow.webContents.send('update_error', err.message)
                }
            })
        }

        // Initial check
        checkWithRetry()
    }
}