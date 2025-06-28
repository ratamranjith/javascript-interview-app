// Auto-update functionality
const { ipcRenderer } = require('electron');

// Update notification element (add this to your HTML)
const updateNotification = document.createElement('div');
updateNotification.className = 'fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg cursor-pointer hidden';
updateNotification.id = 'update-notification';
updateNotification.innerHTML = `
  <span id="update-message"></span>
  <button id="update-action" class="ml-2 font-bold"></button>
`;
document.body.appendChild(updateNotification);

document.addEventListener('DOMContentLoaded', function () {
    let htmlFiles = [];
    const tabBar = document.getElementById('tab-bar');
    const contentFrame = document.getElementById('content-frame');
    const addTabButton = document.getElementById('add-tab');
    const titleBar = document.querySelector('.title-bar');

    // Update handlers
    ipcRenderer.on('update_available', () => {
        const notification = document.getElementById('update-notification');
        const message = document.getElementById('update-message');
        const action = document.getElementById('update-action');

        message.textContent = 'New update available!';
        action.textContent = 'Download';
        action.onclick = () => {
            ipcRenderer.send('start_update');
            action.textContent = 'Downloading...';
            action.disabled = true;
        };

        notification.classList.remove('hidden');
    });

    ipcRenderer.on('update_downloaded', () => {
        const notification = document.getElementById('update-notification');
        const message = document.getElementById('update-message');
        const action = document.getElementById('update-action');

        message.textContent = 'Update downloaded. Restart to apply updates?';
        action.textContent = 'Restart';
        action.onclick = () => {
            ipcRenderer.send('restart_app');
        };
        action.disabled = false;

        notification.classList.remove('hidden');
    });

    ipcRenderer.on('update_error', (event, error) => {
        const notification = document.getElementById('update-notification');
        const message = document.getElementById('update-message');
        const action = document.getElementById('update-action');

        message.textContent = `Update error: ${error}`;
        action.textContent = 'Retry';
        action.onclick = () => {
            ipcRenderer.send('start_update');
            action.textContent = 'Downloading...';
            action.disabled = true;
        };

        notification.classList.remove('hidden');
    });

    // Fetch Json Files
    fetch('topics.json')
        .then(response => response.json())
        .then(data => {
            htmlFiles = data;
            generateTabs();
        })
        .catch(err => {
            console.error('Error loading tabs configuration:', err);
            // Fallback to default tabs
            htmlFiles = [
                { name: 'Home', file: 'content1.html', default: true }
            ];
            generateTabs();
        });

    // Make title bar draggable
    let isDragging = false;
    let offsetX, offsetY;

    titleBar.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only left mouse button

        isDragging = true;
        const bounds = require('electron').remote.getCurrentWindow().getBounds();
        offsetX = e.screenX - bounds.x;
        offsetY = e.screenY - bounds.y;

        // Prevent text selection during drag
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const { remote } = require('electron');
        const win = remote.getCurrentWindow();
        win.setPosition(
            e.screenX - offsetX,
            e.screenY - offsetY
        );
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    function generateTabs() {
        tabBar.innerHTML = '';

        htmlFiles.forEach((item, index) => {
            const tab = document.createElement('button');
            tab.className = `px-4 py-2 border-r border-gray-300 whitespace-nowrap flex items-center ${item.default ? 'bg-white text-blue-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-50'
                }`;
            tab.innerHTML = `
                ${item.name}
                <button class="ml-2 text-gray-400 hover:text-gray-600 tab-close" data-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            `;
            tab.dataset.content = item.file;

            tab.addEventListener('click', function (e) {
                if (!e.target.classList.contains('tab-close')) {
                    switchTab(this);
                }
            });

            tabBar.appendChild(tab);
        });

        // Add close button event listeners
        document.querySelectorAll('.tab-close').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const index = this.getAttribute('data-index');
                closeTab(index);
            });
        });

        // Load default content
        const defaultTab = htmlFiles.find(item => item.default) || htmlFiles[0];
        if (defaultTab) {
            loadContent(defaultTab.file);
        }
    }

    function switchTab(tabElement) {
        document.querySelectorAll('#tab-bar > button').forEach(t => {
            t.className = 'px-4 py-2 border-r border-gray-300 whitespace-nowrap flex items-center bg-gray-100 text-gray-700 hover:bg-gray-50';
        });

        tabElement.className = 'px-4 py-2 border-r border-gray-300 whitespace-nowrap flex items-center bg-white text-blue-600';

        const contentFile = tabElement.getAttribute('data-content');
        loadContent(contentFile);
    }

    function closeTab(index) {
        if (htmlFiles.length <= 1) return;
        htmlFiles.splice(index, 1);
        generateTabs();
    }

    function loadContent(file) {
        if (file === 'content1.html') {
            contentFrame.innerHTML = `
                <h1 class="text-2xl font-bold mb-4">Welcome to my Windows-style app!</h1>
                <p class="text-gray-700">This app has custom window borders and controls like a Windows application.</p>
            `;
        } else {
            fetch(file)
                .then(response => {
                    if (!response.ok) throw new Error('File not found');
                    return response.text();
                })
                .then(html => {
                    contentFrame.innerHTML = html;
                })
                .catch(err => {
                    console.error('Failed to load content:', err);
                    contentFrame.innerHTML = `
                        <div class="p-4 text-red-600">
                            <h1 class="text-xl font-bold mb-2">Error loading content</h1>
                            <p>Could not load ${file}. Please make sure the file exists.</p>
                            <p class="text-sm mt-2">Error: ${err.message}</p>
                        </div>
                    `;
                });
        }
    }

    addTabButton.addEventListener('click', function () {
        const newTabName = prompt('Enter name for new tab:');
        if (newTabName) {
            const newFileName = `content${htmlFiles.length + 1}.html`;
            htmlFiles.push({
                name: newTabName,
                file: newFileName
            });
            generateTabs();
            console.log(`New tab added. You need to create ${newFileName}`);
        }
    });

    // Window controls
    document.querySelector('.window-control.minimize').addEventListener('click', () => {
        ipcRenderer.send('minimize-window');
    });

    document.querySelector('.window-control.maximize').addEventListener('click', () => {
        ipcRenderer.send('maximize-window');
    });

    document.querySelector('.window-control.close').addEventListener('click', () => {
        ipcRenderer.send('close-window');
    });

    ipcRenderer.on('window-state-changed', (event, isMaximized) => {
        const maximizeBtn = document.querySelector('.window-control.maximize');
        if (isMaximized) {
            maximizeBtn.innerHTML = '<div class="maximize-icon"></div>';
        } else {
            maximizeBtn.innerHTML = '<div class="restore-icon"></div>';
        }
    });
});