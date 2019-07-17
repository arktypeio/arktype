import "dotenv/config"
import { app, BrowserWindow, screen } from "electron"
// import electronDevtoolsInstaller, {
//     REACT_DEVELOPER_TOOLS,
//     APOLLO_DEVELOPER_TOOLS
// } from "electron-devtools-installer"

let mainWindow: BrowserWindow | null

const isDev = () => process.env.NODE_ENV === "development"

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
        height,
        show: false
    })
    // Waiting until devtools is open to show the window
    // avoids an issue that causes Apollo dev tools not to load
    mainWindow.webContents.on("devtools-opened", () => {
        mainWindow!.show()
    })
    mainWindow.on("closed", () => {
        mainWindow = null
    })
    await mainWindow.loadURL(
        isDev() ? `http://localhost:8080/` : `file://${__dirname}/index.html`
    )
    mainWindow.webContents.openDevTools()
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
