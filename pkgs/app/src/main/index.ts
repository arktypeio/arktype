import "dotenv/config"
import {
    app,
    BrowserWindow,
    ipcMain,
    BrowserWindowConstructorOptions
} from "electron"
import { isDev } from "@re-do/utils/dist/node"
import electronDevtoolsInstaller, {
    REACT_DEVELOPER_TOOLS,
    APOLLO_DEVELOPER_TOOLS
} from "electron-devtools-installer"
import { autoUpdater } from "electron-updater"
import { join } from "path"

let mainWindow: BrowserWindow
let builderWindow: BrowserWindow

const defaultElectronOptions: BrowserWindowConstructorOptions = {
    webPreferences: {
        webSecurity: false,
        nodeIntegration: true,
        enableRemoteModule: true
    },
    icon: join(__dirname, "icon.png")
}

const installExtensions = async () => {
    const extensions = {
        REACT_DEVELOPER_TOOLS,
        APOLLO_DEVELOPER_TOOLS
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
    await mainWindow.loadURL(
        isDev() ? `http://localhost:8080/` : `file://${__dirname}/index.html`
    )
}

const createBuilderWindow = async () => {
    builderWindow = new BrowserWindow({
        ...defaultElectronOptions,
        show: false
    })
    // Builder window should always exist, even if it's not shown
    builderWindow.on("close", createBuilderWindow)
    await builderWindow.loadURL(
        isDev()
            ? `http://localhost:8080/builder`
            : `file://${__dirname}/index.html`
    )
}

app.on("ready", async () => {
    if (isDev()) {
        await installExtensions()
    } else {
        autoUpdater.checkForUpdatesAndNotify()
    }
    createMainWindow()
    createBuilderWindow()
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

ipcMain.on("builder", async (event, name) => {
    if (builderWindow.isDestroyed()) {
        await createBuilderWindow()
    }
    if (name === "open") {
        builderWindow.show()
    } else if (name === "close") {
        builderWindow.hide()
    }
    event.returnValue = true
})
