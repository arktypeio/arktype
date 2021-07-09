import { Update, Store, BaseStore } from "react-statelessly"
import { test as runTest } from "@re-do/run"
import { MainActions, Root } from "common"
import { forwardToRenderer, replayActionMain } from "electron-redux"
import { launchBrowser, closeBrowser } from "./launchBrowser"
import { mainWindow, builderWindow } from "./windows"
import { ValueOf } from "@re-do/utils"
import { createRedoFileDb } from "@re-do/data"

const DEFAULT_BUILDER_WIDTH = 300
const ELECTRON_TITLEBAR_SIZE = 37

export let store: Store<Root, MainActionFunctions>

export const db = createRedoFileDb({
    onChange: (change, context) => {
        // Forward changes from local store to app state store
        if (store) {
            store.update({ data: context.store.getState() })
        }
    }
})

const emptyMainActions: MainActions = {
    saveTest: null,
    runTest: null,
    launchBuilder: null,
    closeBuilder: null
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
    data: db.all()
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
    runTest: async ([id]) => {
        await runTest(db.tests.find((test) => test.id === id).steps)
        return {}
    },
    saveTest: async ([test]) => {
        db.tests.create(test)
        return {}
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
