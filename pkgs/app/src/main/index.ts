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

const createWindows = async () => {
    mainWindow = new BrowserWindow(defaultElectronOptions)
    await mainWindow.loadURL(
        isDev() ? `http://localhost:8080/` : `file://${__dirname}/index.html`
    )
    builderWindow = new BrowserWindow({
        ...defaultElectronOptions,
        show: false
    })
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
    createWindows()
    mainWindow.show()
})

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit()
    }
})

app.on("activate", () => {
    if (mainWindow === null) {
        createWindows()
    }
})

ipcMain.on("builder", async (event, name) => {
    console.warn("GOT EVENT")
    console.warn({ name, event })
    if (name === "open") {
        builderWindow.show()
    } else if (name === "close") {
        builderWindow.hide()
    }
})
