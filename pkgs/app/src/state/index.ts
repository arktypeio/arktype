import { Handler, createStore, Store, Actions } from "react-statelessly"
import { BrowserName, Step } from "@re-do/test"
import {
    forwardToMain,
    forwardToRenderer,
    replayActionRenderer,
    replayActionMain,
    getInitialStateRenderer
} from "electron-redux"
import { StoredTest, Test } from "@re-do/model"

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
    tests: StoredTest[]
    runningTest: StoredTest | null
    savingTest: Test | null
}

export const initialRoot: Root = {
    token: "",
    page: Page.Home,
    cardFilter: "",
    builderActive: false,
    defaultBrowser: "chrome",
    steps: [],
    tests: [],
    runningTest: null,
    savingTest: null
}

const sharedActions: Actions<Root> = {
    deactivateBuilder: { builderActive: false, steps: [] }
}

export const createMainStore = (handler: Handler<Root, Root>) => {
    const mainStore = createStore(
        initialRoot,
        { ...sharedActions },
        { handler, middleware: [forwardToRenderer] }
    )
    replayActionMain(mainStore.underlying as any)
    return mainStore
}

export const createRendererStore = (handler: Handler<Root, Root>) => {
    const rendererStore = createStore(
        getInitialStateRenderer<Root>(),
        { ...sharedActions },
        { handler, middleware: [forwardToMain] }
    )
    replayActionRenderer(rendererStore.underlying as any)
    return rendererStore
}
