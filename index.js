//initialization
const electron = require('electron')
const path = require('node:path')
const fs = require('fs')

const package = require('./package.json')

electron.app.setName('JumPres Viewer')

let win;
let config;

async function main() {
    if (process.argv.includes('--version') || process.argv.includes('-v')) {
        process.stdout.write(`JumPres ${package.version}\n`, () => { //console.log then process.exit isn't safe since console.log is async, so that's why it's done with process.stdout instead
            process.exit(0)
        })

        return;
    }

    if (process.platform === 'linux') {
        electron.app.commandLine.appendSwitch('--disable-features', 'WaylandWpColorManagerV1') //colors on wayland are super washed out in newer chromium versions for some reason, but this seems to fix it
    }

    if (!config.hardware_decoding) {
        electron.app.commandLine.appendSwitch('--disable-accelerated-video-decode')
    }

    electron.app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') electron.app.quit()
    })

    await electron.app.whenReady()

    //etc helpers
    electron.ipcMain.handle('is-focused', () => {
        if (win) {
            return win.isFocused();
        } else {
            return false;
        }
    })

    electron.ipcMain.handle('is-steam', () => {
        return runningOnSteam;
    })

    electron.ipcMain.handle('reload', () => {
        if (win) {
            win.webContents.reload()
        }
    })

    electron.ipcMain.handle('set-fullscreen', (e, value) => {
        if (win) {
            win.setFullScreen(value)
        }
    })

    electron.ipcMain.handle('set-on-top', (e, value) => {
        if (win) {
            win.setAlwaysOnTop(value)
        }
    })

    electron.ipcMain.handle('set-zoom', (e, amount) => {
        if (win) {
            win.webContents.setZoomLevel(amount)
        }
    })

    await createWindow()

    setupUserstylesWatcher()

    electron.app.on('activate', () => {
        if (electron.BrowserWindow.getAllWindows().length === 0) createWindow()
    })
}

async function createWindow() {
    let fullscreen = true; // JumPres MUST start in fullscreen to look normal on official hardware

    win = new electron.BrowserWindow({
        width: 1280,
        height: 720,
        backgroundColor: '#282828',
        fullscreen, //this sometimes doesn't work for people, so it's repeated below
        fullscreenable: true, //explicitly enable fullscreen functionality on MacOS
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
            sandbox: false, //allows me to use node apis in preload, but doesn't allow youtube to do so (solely need node apis for requiring the modules)
    nodeIntegrationInSubFrames: true, //since nodeIntegration is already false, it doesn't actually enable nodeIntegration in frames, but it does enable the preload script in frames which is needed for some weird edgecases where youtube may place the entirety of leanback in a frame
    preload: null
        },
        title: 'JumPres Viewer'
    })

    // Ensure the *content* area (excluding OS window borders) stays 16:9 on all platforms.
    const [ outerW, outerH ] = win.getSize()
    const [ innerW, innerH ] = win.getContentSize()
    const extraWidth = outerW - innerW;
    const extraHeight = outerH - innerH;

    const TARGET_RATIO = 16 / 9;
    const isWindows = process.platform === 'win32'

    if (isWindows) {
        // Custom resize handling for Windows where OS chrome breaks outer-ratio locking.
        // To keep this implementation simple, we'll prevent the user from resizing
        // the window on the wide side. It will automatically adjust the height.
        win.on('will-resize', (event, newBounds) => {
            event.preventDefault()

            const contentW = newBounds.width - extraWidth;
            const adjustedContentH = Math.round(contentW / TARGET_RATIO)

            win.setBounds({
                width: newBounds.width,
                height: adjustedContentH + extraHeight
            })
        })

        win.setBounds({
            width: outerW,
            height: Math.round((outerW - extraWidth) / TARGET_RATIO) + extraHeight
        })
    } else {
        // Built-in electron aspect ratio lock works fine elsewhere.
        win.setAspectRatio(TARGET_RATIO)
    }

    win.setMenuBarVisibility(false)
    win.setAutoHideMenuBar(false)

    win.once('ready-to-show', () => {
        win.setFullScreen(fullscreen)
        win.setAlwaysOnTop(config.keep_on_top)
        win.show()
    })

    if (process.argv.includes('--debug-gpu')) {
        console.log('loading chrome://gpu')
        win.loadURL('chrome://gpu', { userAgent })
        return;
    }

    if (process.argv.includes('--enable-devtools')) {
        console.log('launching with devtools enabled')
        win.webContents.toggleDevTools()
    }

    console.log('Loading JumPres Viewer')
    win.loadURL('https://cronus.ws4k.net/app/msgboard.html')

    //keep window title as VacuumTube
    win.webContents.on('page-title-updated', () => {
        win.setTitle('JumPres Viewer')
    })
}

main()
