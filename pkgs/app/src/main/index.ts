import {
    app,
    BrowserWindow,
    BrowserWindowConstructorOptions,
    nativeImage,
    ipcMain
} from "electron"
import electronDevtoolsInstaller, {
    REACT_DEVELOPER_TOOLS,
    APOLLO_DEVELOPER_TOOLS,
    REDUX_DEVTOOLS
} from "electron-devtools-installer"
import { ActionData } from "react-statelessly"
import { autoUpdater } from "electron-updater"
import { test as runTest } from "@re-do/test"
import { join } from "path"
import { createMainStore, Root } from "state"
import { loadStore } from "./persist"
import { StoredTest, Test } from "@re-do/model"
import { launchBrowser, closeBrowser } from "./launchBrowser"
import icon from "assets/icon.png"

let mainWindow: BrowserWindow
let builderWindow: BrowserWindow

const DEFAULT_BUILDER_WIDTH = 300
const ELECTRON_TITLEBAR_SIZE = 37
const isDev = process.env.NODE_ENV === "development"

const BASE_URL = isDev
    ? `http://localhost:${process.env["DEV_SERVER_PORT"]}`
    : `file://${__dirname}/index.html`

const persistedStore = loadStore({ path: join(process.cwd(), "redo.json") })

const store = createMainStore({
    launchBuilder: async () => {
        const { height, x, y } = mainWindow.getBounds()
        builderWindow.setBounds({
            height,
            width: DEFAULT_BUILDER_WIDTH,
            x,
            y: y - ELECTRON_TITLEBAR_SIZE
        })
        builderWindow.show()
        await launchBrowser(store, mainWindow)
        return { builderActive: true }
    },
    closeBuilder: async () => {
        if (builderWindow.isVisible()) {
            builderWindow.hide()
        }
        await closeBrowser()
        return { builderActive: false, steps: [] }
    },
    runTest: async (test: StoredTest) => {
        await runTest(persistedStore.testToSteps(test as StoredTest))
        return {}
    },
    saveTest: async (test: Test) => {
        persistedStore.createTest(test as any)
        store.update({ tests: (_) => _.concat(_) })
        return {}
    }
})

ipcMain.on("redux-action", async (event, action: ActionData<Root>) => {
    const mainActions = action.payload.main
    console.log(JSON.stringify(mainActions, null, 4))
    if (mainActions) {
        for (const entry in Object.entries(mainActions)) {
            const [name, args] = entry
            console.log(JSON.stringify({ name, args }, null, 4))
            await (store as any)[name](...(args as any))
        }
    }
})

store.update({ tests: persistedStore.getTests() })

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
        title: "Redo"
    })
    await mainWindow.loadURL(BASE_URL)
    mainWindow.maximize()
    mainWindow.show()
}

const createBuilderWindow = async () => {
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

app.on("ready", async () => {
    if (isDev) {
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
