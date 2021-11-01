import { Update, Store, BaseStore } from "react-statelessly"
import { test as runTest } from "@re-do/run"
import { MainActions, Root } from "common"
import { stateSyncEnhancer } from "electron-redux/main"
import { launchBrowser, closeBrowser } from "./launchBrowser.js"
import { mainWindow, builderWindow } from "./electronWindows.js"
import { EntryOf } from "@re-do/utils"
import { fromRedo, ensureDir } from "@re-do/node"
import { createRedoFileDb } from "@re-do/data"
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { version } from "../../package.json"

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
    closeBuilder: null,
    __rendererLaunched: null,
    __browserLaunched: null
}

const versionDir = fromRedo(version)
const cacheFile = join(versionDir, ".redo-cache.json")

type RedoCache = {
    token?: string
}

const getCache = () => {
    let cache: RedoCache = {}
    try {
        cache = JSON.parse(readFileSync(cacheFile).toString())
    } catch {
        ensureDir(versionDir)
        writeFileSync(cacheFile, JSON.stringify({}))
    }
    return cache
}

const updateCache = (updates: Partial<RedoCache>) =>
    writeFileSync(
        cacheFile,
        JSON.stringify({ ...getCache(), ...updates }, null, 4)
    )

const initialState: Root = {
    page: "HOME",
    token: getCache().token ?? "",
    cardFilter: "",
    defaultBrowser: "chrome",
    builder: {
        steps: [],
        active: false,
        installingBrowser: "",
        actions: []
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
        await runTest(db.tests.find((test) => test.id === id).steps, {
            headless: false
        })
        return {}
    },
    saveTest: async ([test]) => {
        db.tests.create(test)
        return {}
    },
    __rendererLaunched: ([location]) => {
        if (process.env["ENABLE_TEST_HOOKS"]) {
            writeFileSync(join(process.cwd(), `${location}.launched`), "")
            return { main: { launchBuilder: [] } }
        }
        return {}
    },
    __browserLaunched: () => {
        if (process.env["ENABLE_TEST_HOOKS"]) {
            writeFileSync(join(process.cwd(), "browser.listening"), "")
        }
        return {}
    }
}

store = new Store(initialState, mainActions, {
    reduxOptions: {
        enhancers: (enhancers) => [stateSyncEnhancer()].concat(enhancers)
    },
    onChange: [
        {
            token: (token) => {
                updateCache({ token })
            },
            main: async (changes) => {
                const requiredActions = Object.entries(changes).filter(
                    ([name, args]) => !!args
                ) as EntryOf<MainActions>[]
                for (const action of requiredActions) {
                    const [name, args] = action
                    await store.actions[name](args as any)
                    store.update({ main: { [name]: null } })
                }
            }
        }
    ]
})
