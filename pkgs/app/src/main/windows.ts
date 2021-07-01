import {
    BrowserWindow,
    BrowserWindowConstructorOptions,
    nativeImage
} from "electron"
import { isDev } from "@re-do/node-utils"
import icon from "assets/icon.png"
import { store } from "./store"

export let mainWindow: BrowserWindow
export let builderWindow: BrowserWindow

const BASE_URL = isDev()
    ? `http://localhost:${process.env["DEV_SERVER_PORT"]}`
    : `file://${__dirname}/../renderer/index.html`

const defaultElectronOptions: BrowserWindowConstructorOptions = {
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
    },
    icon: nativeImage.createFromDataURL(icon),
    autoHideMenuBar: true,
    show: false
}

export const createMainWindow = async () => {
    mainWindow = new BrowserWindow({
        ...defaultElectronOptions,
        title: "Redo"
    })
    await mainWindow.loadURL(BASE_URL)
    mainWindow.maximize()
    mainWindow.show()
}

export const createBuilderWindow = async () => {
    builderWindow = new BrowserWindow({
        ...defaultElectronOptions,
        title: "New Test"
    })
    // Builder window should always exist, even if it's not shown
    builderWindow.on("close", () => {
        store.$.closeBuilder()
        createBuilderWindow()
    })
    await builderWindow.loadURL(`${BASE_URL}#builder`)
}
