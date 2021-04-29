import { Handler, createStore, Store } from "react-statelessly"
import { BrowserName, Step } from "@re-do/test"
import {
    forwardToMain,
    forwardToRenderer,
    replayActionRenderer,
    replayActionMain,
    getInitialStateRenderer
} from "electron-redux"

export enum Page {
    Home = "HOME",
    SignIn = "SIGN_IN",
    SignUp = "SIGN_UP"
}

export type Root = {
    token: string
    page: Page
    cardFilter: string
    builderActive: boolean
    steps: Step[]
    defaultBrowser: BrowserName
}

export const initialRoot: Root = {
    token: "",
    page: Page.Home,
    cardFilter: "",
    builderActive: false,
    defaultBrowser: "chrome",
    steps: []
}

export const createMainStore = (handler: Handler<Root, Root>) => {
    const mainStore = createStore({
        initial: initialRoot,
        handler,
        middleware: [forwardToRenderer]
    })
    replayActionMain(mainStore.underlying as any)
    return mainStore
}

export const createRendererStore = (handler: Handler<Root, Root>) => {
    const rendererStore = createStore({
        initial: getInitialStateRenderer<Root>(),
        handler,
        middleware: [forwardToMain]
    })
    replayActionRenderer(rendererStore.underlying as any)
    return rendererStore
}

export const deactivateBuilder = (store: Store<Root>) =>
    store.update({ builderActive: false, steps: [] })
