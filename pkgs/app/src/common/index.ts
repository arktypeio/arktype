import { BrowserName, Step as StepData } from "@re-do/test"
import { Relationships, Shallow, ShallowModel } from "persist-statelessly"

export type Step = Omit<StepData, "selector"> & {
    element?: Element
}

export type Tag = {
    value: string
}

export type Element = {
    selector: string
}

export type Test = {
    name: string
    steps: Step[]
    tags: Tag[]
}

export type RedoData = {
    tests: Test[]
    elements: Element[]
    steps: Step[]
    tags: Tag[]
}

export type Page = "HOME" | "SIGN_IN" | "SIGN_UP"

export type UnsavedStep = Step & { id: number }

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
    data: ShallowModel<RedoData, "id">
}

export type MainActions = {
    runTest: [Test] | null
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
