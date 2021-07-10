export type ClickArgs = {
    kind: "click"
    element: Element
}

export type GoArgs = {
    kind: "go"
    url: string
}

export type SetArgs = {
    kind: "set"
    element: Element
    value: string
}

export type AssertTextArgs = {
    kind: "assertText"
    element: Element
    value: string
}

export type ScreenshotArgs = {
    kind: "screenshot"
}

export type CustomStepArgs = {
    kind: string
    [argName: string]: any
}

export type Step =
    | ClickArgs
    | GoArgs
    | SetArgs
    | ScreenshotArgs
    | AssertTextArgs
    | CustomStepArgs

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
