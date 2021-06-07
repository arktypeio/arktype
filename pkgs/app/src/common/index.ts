import { BrowserName, Step } from "@re-do/test"
import { StoredTest, Test } from "@re-do/model"

export type Page = "HOME" | "SIGN_IN" | "SIGN_UP"

export type UnsavedStep = Step & { id: number }

export type Root = {
    token: string
    page: Page
    cardFilter: string
    builderActive: boolean
    steps: UnsavedStep[]
    defaultBrowser: BrowserName
    tests: StoredTest[]
    main: MainActions
    renderer: RendererActions
}

export type MainActions = {
    runTest: [StoredTest] | null
    saveTest: [Test] | null
    launchBuilder: [] | null
    closeBuilder: [] | null
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
