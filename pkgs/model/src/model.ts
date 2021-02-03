export type Test = {
    name: string
    steps: Step[]
    tags: string[]
}

export type Step<Kind extends keyof StepKinds> = {
    kind: Kind
} & StepKinds[Kind]

export type StepKinds = {
    click: {
        selector: string
    },
    hover: {
        selector: string
        duration?: number
    },
    set: {
        selector: string,
        text: string
    },
    strike: {
        key: string
    },
    go: {
        url: string
    },
    screenshot: {},
    assertText: {
        selector: string,
        text: string
    },
    assertVisibility: {
        selector: string,
        visible?: boolean
    }

}