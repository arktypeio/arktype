import { Update, Store, BaseStore } from "react-statelessly"
import { test as runTest } from "@re-do/test"
import { MainActions, RedoData, Root } from "common"
import { forwardToRenderer, replayActionMain } from "electron-redux"
import { TestData } from "@re-do/model"
import { launchBrowser, closeBrowser } from "./launchBrowser"
import { mainWindow, builderWindow } from "./windows"
import { ValueOf } from "@re-do/utils"
import { createSteps, testToSteps, getNextId } from "./data"
import { FileStore } from "persist-statelessly"
import { join } from "path"

const DEFAULT_BUILDER_WIDTH = 300
const ELECTRON_TITLEBAR_SIZE = 37

export const defaultRedoJsonPath = join(process.cwd(), "redo.json")
export const defaultRedoData: RedoData = { tests: [], elements: [], steps: [] }

export let store: Store<Root, MainActionFunctions>

export const data = new FileStore(
    defaultRedoData,
    {},
    {
        path: defaultRedoJsonPath,
        onChange: (change, context) => {
            // Forward changes from local store to app state store
            if (store) {
                store.update({ data: context.store.getState() })
            }
        }
    }
)

const emptyMainActions: MainActions = {
    saveTest: null,
    runTest: null,
    launchBuilder: null,
    closeBuilder: null,
    reloadData: null
}

const initialState: Root = {
    page: "HOME",
    token: "",
    cardFilter: "",
    defaultBrowser: "chrome",
    builder: {
        steps: [],
        active: false
    },
    main: emptyMainActions,
    renderer: {},
    data: data.getState()
}

type ActionReturn = Update<Root> | Promise<Update<Root>>

type MainActionFunctions = {
    [K in keyof MainActions]-?: [] extends MainActions[K]
        ? (store: BaseStore<Root, any>) => ActionReturn
        : (
              args: NonNullable<MainActions[K]>,
              store: BaseStore<Root, any>
          ) => ActionReturn
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
        return { builder: { active: true, steps: [] } }
    },
    closeBuilder: async () => {
        if (builderWindow.isVisible()) {
            builderWindow.hide()
        }
        await closeBrowser()
        return { builder: { active: false, steps: [] } }
    },
    runTest: async ([test]) => {
        await runTest(testToSteps(data, test as TestData))
        return {}
    },
    saveTest: async ([{ steps, ...rest }]) => {
        const testData: TestData = {
            ...rest,
            steps: createSteps(data, steps),
            id: getNextId(data.get("tests"))
        }
        data.update({ tests: (_) => _.concat(testData) })
        return { data: { tests: (_) => _.concat(testData) } }
    },
    reloadData: () => {
        data.refresh()
        return { data: data.getState() }
    }
}

store = new Store(initialState, mainActions, {
    middleware: [forwardToRenderer],
    onChange: {
        main: async (changes) => {
            const requiredActions = Object.entries(changes).filter(
                ([name, args]) => !!args
            ) as [keyof MainActions, ValueOf<MainActions>][]
            for (const action of requiredActions) {
                const [name, args] = action
                await store.actions[name](args as any)
                store.update({ main: { [name]: null } })
            }
        }
    }
})

replayActionMain(store.underlying as any)
