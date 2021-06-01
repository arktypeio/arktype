import { ListenerMap, createStore, Actions } from "react-statelessly"
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
    main: MainActions
    renderer: RendererActions
}

export type MainActions = {
    runTest?: [StoredTest]
    saveTest?: [Test]
    launchBuilder?: []
    closeBuilder?: []
}

export type RendererActions = {}

export const getInitialState = () => ({
    token: "",
    page: Page.Home,
    cardFilter: "",
    builderActive: false,
    defaultBrowser: "chrome",
    steps: [],
    tests: [],
    main: {},
    renderer: {}
})

export const createMainStore = <T extends Actions<Root>>(mainActions: T) => {
    const mainStore = createStore(initialRoot, mainActions, {
        middleware: [forwardToRenderer]
    })
    replayActionMain(mainStore.underlying as any)
    return mainStore
}

export const createRendererStore = (onChange: ListenerMap<Root, Root>) => {
    const rendererStore = createStore(
        getInitialStateRenderer<Root>(),
        {},
        { onChange, middleware: [forwardToMain] }
    )
    replayActionRenderer(rendererStore.underlying as any)
    return rendererStore
}
