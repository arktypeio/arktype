import { ipcMain } from "electron"
import { ActionData, Update, Store } from "react-statelessly"
import { test as runTest } from "@re-do/test"
import { join } from "path"
import { MainActions, Root } from "common"
import { forwardToRenderer, replayActionMain } from "electron-redux"
import { loadStore } from "./persist"
import { StoredTest, Test } from "@re-do/model"
import { launchBrowser, closeBrowser } from "./launchBrowser"
import { mainWindow, builderWindow } from "./windows"

const DEFAULT_BUILDER_WIDTH = 300
const ELECTRON_TITLEBAR_SIZE = 37

const persistedStore = loadStore({ path: join(process.cwd(), "redo.json") })

const emptyMainActions: MainActions = {
    saveTest: null,
    runTest: null,
    launchBuilder: null,
    closeBuilder: null
}

const initialState: Root = {
    token: "",
    page: "HOME",
    cardFilter: "",
    builderActive: false,
    defaultBrowser: "chrome",
    steps: [],
    tests: persistedStore.getTests(),
    main: emptyMainActions,
    renderer: {}
}

type MainActionFunctions = {
    [K in keyof MainActions]-?: (
        ...args: NonNullable<MainActions[K]>
    ) => Update<Root> | Promise<Update<Root>>
}

const mainActions: MainActionFunctions = {
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
        const storedTest = persistedStore.createTest(test)
        store.update({ tests: (_) => _.concat(storedTest) })
        return {}
    }
}

export const store = new Store(initialState, mainActions, {
    middleware: [forwardToRenderer]
})

replayActionMain(store.underlying as any)

ipcMain.on("redux-action", async (event, action: ActionData<Root>) => {
    // TODO: Convert this to a queue, handle race condition
    const mainActions = action.payload.main
    if (mainActions) {
        const requiredActions = Object.entries(mainActions).filter(
            ([name, args]) => !!args
        )
        for (const action of requiredActions) {
            const [name, args] = action
            await (store as any)[name](...(args as any))
            store.update({ main: { [name]: null } })
        }
    }
})
