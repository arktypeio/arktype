import "dotenv/config"
import { app, BrowserWindow, screen } from "electron"
import { isDev } from "@re-do/utils"

// import electronDevtoolsInstaller, {
//     REACT_DEVELOPER_TOOLS,
//     APOLLO_DEVELOPER_TOOLS
// } from "electron-devtools-installer"

let mainWindow: BrowserWindow | null

const installExtensions = () => {
    // const extensions = {
    //     REACT_DEVELOPER_TOOLS,
    //     APOLLO_DEVELOPER_TOOLS
    // }
    // Object.entries(extensions).forEach(async extension => {
    //     const [name, reference] = extension
    //     try {
    //         console.log(`Installing ${name}...`)
    //         await electronDevtoolsInstaller(reference)
    //     } catch (e) {
    //         console.log(`Failed to install ${name}:`)
    //         console.log(e)
    //     }
    // })
}

const createWindow = async () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    mainWindow = new BrowserWindow({
        webPreferences: {
            webSecurity: false,
            nodeIntegration: true,
            contextIsolation: false
        },
        width,
        height
    })
    mainWindow.on("closed", () => {
        mainWindow = null
    })
    if (isDev()) {
        mainWindow.webContents.openDevTools()
    }
    await mainWindow.loadURL(
        isDev() ? `http://localhost:8080/` : `file://${__dirname}/index.html`
    )
    mainWindow.show()
}

app.on("ready", async () => {
    await installExtensions()
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
