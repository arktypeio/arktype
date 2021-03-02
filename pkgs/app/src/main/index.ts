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
import { createMainStore } from "state"

let mainWindow: BrowserWindow
let builderWindow: BrowserWindow

const DEFAULT_BUILDER_WIDTH = 300
const BASE_URL = isDev()
    ? `http://localhost:8080`
    : `file://${__dirname}/index.html`

const store = createMainStore({
    builderActive: async (isActive) => {
        if (builderWindow.isDestroyed()) {
            return
        }
        if (isActive) {
            builderWindow.show()
        } else {
            builderWindow.hide()
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
    mainWindow = new BrowserWindow(defaultElectronOptions)
    await mainWindow.loadURL(BASE_URL)
    mainWindow.maximize()
    mainWindow.show()
}

const createBuilderWindow = async () => {
    const { height, x, y } = mainWindow.getBounds()
    builderWindow = new BrowserWindow({
        ...defaultElectronOptions,
        height,
        width: DEFAULT_BUILDER_WIDTH,
        x,
        y
    })
    // Builder window should always exist, even if it's not shown
    builderWindow.on("close", () => {
        store.mutate({ builderActive: false })
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
