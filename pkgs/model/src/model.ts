import { Step } from "@re-do/test"

export type StepData = Omit<Step, "selector"> & {
    element?: number
    id: number
}

export type TestData = {
    id: number
    name: string
    steps: number[]
    tags: string[]
}

export type ElementData = {
    id: number
    selector: string
}

export type Test = {
    name: string
    steps: Step[]
    tags: string[]
}
