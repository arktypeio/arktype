import "dotenv/config"
import { app, BrowserWindow, BrowserWindowConstructorOptions } from "electron"
import { isDev } from "@re-do/utils/dist/node"
import electronDevtoolsInstaller, {
    REACT_DEVELOPER_TOOLS,
    APOLLO_DEVELOPER_TOOLS,
    REDUX_DEVTOOLS
} from "electron-devtools-installer"
import { autoUpdater } from "electron-updater"
import { join } from "path"
import { createMainStore, Root, deactivateBuilder } from "state"
import { Store } from "react-statelessly"
import { launchBrowser, closeBrowser } from "./launchBrowser"

let mainWindow: BrowserWindow
let builderWindow: BrowserWindow
let store: Store<Root>

const DEFAULT_BUILDER_WIDTH = 300
const ELECTRON_TITLEBAR_SIZE = 37

const BASE_URL = isDev()
    ? `http://localhost:8080`
    : `file://${__dirname}/index.html`

store = createMainStore({
    builderActive: async (isActive) => {
        if (builderWindow.isDestroyed()) {
            // TODO: Add logic to wait if activating? Possible race condition
            return
        }
        if (isActive) {
            const { height, x, y } = mainWindow.getBounds()
            builderWindow.setBounds({
                height,
                width: DEFAULT_BUILDER_WIDTH,
                x,
                y: y - ELECTRON_TITLEBAR_SIZE
            })
            builderWindow.show()
            launchBrowser(store, mainWindow)
        } else {
            builderWindow.hide()
            closeBrowser()
        }
    }
})

const defaultElectronOptions: BrowserWindowConstructorOptions = {
    webPreferences: {
        webSecurity: false,
        nodeIntegration: true,
        enableRemoteModule: true
    },
    icon: join(__dirname, "icon.png"),
    autoHideMenuBar: true,
    show: false
}

const installExtensions = async () => {
    const extensions = {
        REACT_DEVELOPER_TOOLS,
        APOLLO_DEVELOPER_TOOLS,
        REDUX_DEVTOOLS
    }
    for (const [name, reference] of Object.entries(extensions)) {
        try {
            console.log(`Installing ${name}...`)
            await electronDevtoolsInstaller(reference)
        } catch (e) {
            console.log(`Failed to install ${name}:`)
            console.log(e)
        }
    }
}

const createMainWindow = async () => {
    mainWindow = new BrowserWindow({
        ...defaultElectronOptions,
        title: "New Test"
    })
    await mainWindow.loadURL(BASE_URL)
    mainWindow.maximize()
    mainWindow.show()
}

const createBuilderWindow = async () => {
    builderWindow = new BrowserWindow(defaultElectronOptions)
    // Builder window should always exist, even if it's not shown
    builderWindow.on("close", () => {
        deactivateBuilder(store)
        createBuilderWindow()
    })
    await builderWindow.loadURL(`${BASE_URL}/#builder`)
}

app.on("ready", async () => {
    if (isDev()) {
        await installExtensions()
    } else {
        await autoUpdater.checkForUpdatesAndNotify()
    }
    await createMainWindow()
    await createBuilderWindow()
})

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit()
    }
})

app.on("activate", () => {
    if (mainWindow === null) {
        createMainWindow()
    }
})
