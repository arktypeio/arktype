import {
    BrowserWindow,
    BrowserWindowConstructorOptions,
    nativeImage
} from "electron"
import electronDevtoolsInstaller, {
    REACT_DEVELOPER_TOOLS,
    APOLLO_DEVELOPER_TOOLS,
    REDUX_DEVTOOLS
} from "electron-devtools-installer"
import { isDev } from "@re-do/node-utils"
import icon from "assets/icon.png"

let mainWindow: BrowserWindow
let builderWindow: BrowserWindow

const BASE_URL = isDev()
    ? `http://localhost:${process.env["DEV_SERVER_PORT"]}`
    : `file://${__dirname}/index.html`

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

export const getMainWindow = () => mainWindow

export const createBuilderWindow = async () => {
    builderWindow = new BrowserWindow({
        ...defaultElectronOptions,
        title: "New Test"
    })
    // Builder window should always exist, even if it's not shown
    builderWindow.on("close", () => {
        store.closeBuilder()
        createBuilderWindow()
    })
    await builderWindow.loadURL(`${BASE_URL}/#builder`)
}

export const getBuilderWindow = () => builderWindow
