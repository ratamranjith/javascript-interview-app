const { ipcRenderer } = require('electron')

// DOM Elements
const contentFrame = document.getElementById('content-frame')
const tabBar = document.getElementById('tab-bar')

// Create update notification element
const updateNotification = document.createElement('div')
updateNotification.id = 'update-notification'
updateNotification.className = 'hidden'
updateNotification.innerHTML = `
  <span id="update-message"></span>
  <button id="update-action" class="update-button"></button>
`
document.body.appendChild(updateNotification)

// Update handlers
ipcRenderer.on('update_available', () => {
    updateNotification.classList.remove('error')
    const message = document.getElementById('update-message')
    const action = document.getElementById('update-action')

    message.textContent = 'New update available!'
    action.textContent = 'Download'
    action.onclick = () => {
        ipcRenderer.send('start_update')
        action.textContent = 'Downloading...'
        action.disabled = true
    }

    updateNotification.classList.add('visible')
})

ipcRenderer.on('update_downloaded', () => {
    updateNotification.classList.remove('error')
    const message = document.getElementById('update-message')
    const action = document.getElementById('update-action')

    message.textContent = 'Update ready to install!'
    action.textContent = 'Restart Now'
    action.onclick = () => {
        ipcRenderer.send('restart_app')
    }
    action.disabled = false

    updateNotification.classList.add('visible')
})

// Update the update_error handler:
ipcRenderer.on('update_error', (event, error) => {
    updateNotification.classList.add('error')
    const message = document.getElementById('update-message')
    const action = document.getElementById('update-action')

    if (error.includes('ERR_CONNECTION_REFUSED')) {
        message.textContent = 'Cannot connect to update server'
        action.textContent = 'Retry Later'
        action.disabled = true
        setTimeout(() => updateNotification.classList.remove('visible'), 5000)
    } else {
        message.textContent = `Update failed: ${error}`
        action.textContent = 'Retry'
        action.onclick = () => {
            ipcRenderer.send('start_update')
            action.textContent = 'Downloading...'
            action.disabled = true
        }
    }

    updateNotification.classList.add('visible')
})

// Add progress indicator
ipcRenderer.on('download_progress', (event, progress) => {
    const message = document.getElementById('update-message')
    message.textContent = `Downloading update: ${Math.floor(progress.percent)}%`
})

// Window controls
document.querySelector('.minimize').addEventListener('click', () => {
    ipcRenderer.send('minimize-window')
})

document.querySelector('.maximize').addEventListener('click', () => {
    ipcRenderer.send('maximize-window')
})

document.querySelector('.close').addEventListener('click', () => {
    ipcRenderer.send('close-window')
})

// Tab system functionality
async function loadContent(contentPath) {
    try {
        const response = await fetch(contentPath)
        if (!response.ok) throw new Error('Failed to load content')
        const content = await response.text()
        contentFrame.innerHTML = content
    } catch (error) {
        contentFrame.innerHTML = `
      <div class="error-message">
        <h2>Error loading content</h2>
        <p>${error.message}</p>
      </div>
    `
        console.error('Error loading content:', error)
    }
}

function switchTab(clickedTab) {
    // Update active tab
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active')
    })
    clickedTab.classList.add('active')

    // Load content
    const contentPath = clickedTab.dataset.content
    console.log(contentPath);
    loadContent(contentPath)
}

// Initialize application
async function initApp() {
    try {
        // Load tabs configuration
        const response = await fetch('../resources/topics.json')
        if (!response.ok) throw new Error('Failed to load tabs configuration')
        const topics = await response.json()

        // Generate tabs
        topics.forEach((topic, index) => {
            const tab = document.createElement('button')
            tab.className = `tab ${topic.default ? 'active' : ''}`
            tab.innerHTML = `
        <span class="material-icons">${topic.icon}</span>
        ${topic.name}
      `
            tab.dataset.content = `content/${topic.file}`

            tab.addEventListener('click', () => switchTab(tab))
            tabBar.appendChild(tab)

            // Load default content
            if (topic.default) {
                loadContent(`content/${topic.file}`)
            }
        })

        // If no default tab, load first tab's content
        if (!topics.some(topic => topic.default) && topics.length > 0) {
            loadContent(`content/${topics[0].file}`)
        }
    } catch (error) {
        console.error('Initialization error:', error)
        // Fallback content
        contentFrame.innerHTML = `
      <div class="error-message">
        <h2>Application Error</h2>
        <p>${error.message}</p>
        <p>Try restarting the application.</p>
      </div>
    `
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', initApp)