import { BrowserWindow, ipcMain } from "electron"
import { ActionData } from "react-statelessly"
import { test as runTest } from "@re-do/test"
import { join } from "path"
import { createMainStore, Root } from "state"
import { loadStore } from "./persist"
import { StoredTest, Test } from "@re-do/model"
import { launchBrowser, closeBrowser } from "./launchBrowser"

const DEFAULT_BUILDER_WIDTH = 300
const ELECTRON_TITLEBAR_SIZE = 37

const persistedStore = loadStore({ path: join(process.cwd(), "redo.json") })
store.update({ tests: persistedStore.getTests() })
export const store = createMainStore({
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
    if (mainActions) {
        for (const entry of Object.entries(mainActions)) {
            const [name, args] = entry
            await (store as any)[name](...(args as any))
        }
    }
})
