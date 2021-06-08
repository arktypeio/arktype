import { BrowserName, Step } from "@re-do/test"
import { StoredTest, Test, Element } from "@re-do/model"

export type Page = "HOME" | "SIGN_IN" | "SIGN_UP"

export type UnsavedStep = Step & { id: number }

export type RedoData = {
    tests: StoredTest[]
    elements: Element[]
}

export type Root = {
    page: Page
    token: string
    cardFilter: string
    defaultBrowser: BrowserName
    builder: {
        active: boolean
        steps: UnsavedStep[]
    }
    main: MainActions
    renderer: RendererActions
    data: RedoData
}

export type MainActions = {
    runTest: [StoredTest] | null
    saveTest: [Test] | null
    launchBuilder: [] | null
    closeBuilder: [] | null
    reloadData: [] | null
}

export type RendererActions = {}

export const supportedEvents = {
    click: "click",
    dblclick: "click",
    submit: "click",
    change: "set",
    select: "set"
} as const

export type SupportedEvent = keyof typeof supportedEvents
