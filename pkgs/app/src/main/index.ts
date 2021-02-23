import "dotenv/config"
import { app, BrowserWindow } from "electron"
import { isDev } from "@re-do/utils/dist/node"
import electronDevtoolsInstaller, {
    REACT_DEVELOPER_TOOLS,
    APOLLO_DEVELOPER_TOOLS
} from "electron-devtools-installer"
import { autoUpdater } from "electron-updater"
import { join } from "path"

let mainWindow: BrowserWindow | null

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

const createWindow = async () => {
    mainWindow = new BrowserWindow({
        webPreferences: {
            webSecurity: false,
            nodeIntegration: true,
            enableRemoteModule: true
        },
        icon: join(__dirname, "icon.png")
    })
    mainWindow.on("closed", () => {
        mainWindow = null
    })
    await mainWindow.loadURL(
        isDev() ? `http://localhost:8080/` : `file://${__dirname}/index.html`
    )
    mainWindow.show()
}

app.on("ready", async () => {
    if (isDev()) {
        await installExtensions()
    } else {
        autoUpdater.checkForUpdatesAndNotify()
    }
    createWindow()
})

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit()
    }
})

app.on("activate", () => {
    if (mainWindow === null) {
        createWindow()
    }
})
