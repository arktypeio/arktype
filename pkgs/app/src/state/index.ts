import { Handler } from "react-statelessly"
import {
    forwardToMain,
    forwardToRenderer,
    replayActionRenderer,
    replayActionMain,
    getInitialStateRenderer
} from "electron-redux"
import { createStore } from "react-statelessly"

export enum Page {
    Home = "HOME",
    SignIn = "SIGN_IN",
    SignUp = "SIGN_UP",
    Results = "RESULTS"
}

export type Root = {
    token: string
    page: Page
    cardFilter: string
    builderActive: boolean
}

export const initialRoot: Root = {
    token: "",
    page: Page.Home,
    cardFilter: "",
    builderActive: false
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
