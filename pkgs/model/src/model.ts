import { Step } from "@re-do/test"

export type StoredStep = Omit<Step, "selector"> & { element: number }

export type StoredTest = {
    name: string
    steps: StoredStep[]
    tags: string[]
}

export type Test = {
    name: string
    steps: Step[]
    tags: string[]
}

export type Element = {
    id: number
    selector: string
}
