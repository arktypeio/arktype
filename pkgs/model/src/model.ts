import { Step } from "@re-do/test"
import { createStore } from "statelessly"
import {
    readJSONSync,
    writeJsonSync,
    existsSync,
    writeJSONSync
} from "fs-extra"
import { v4 } from "uuid"

export type StoredStep = Omit<Step, "selector"> & { element: string }

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
    id: string
    selector: string
}

export type LoadStoreArgs = {
    path: string
}

export type RedoData = {
    tests: StoredTest[]
    elements: Element[]
}

export type RedoStore = ReturnType<typeof loadStore>

export const loadStore = ({ path }: LoadStoreArgs) => {
    if (!existsSync(path)) {
        writeJSONSync(path, { tests: [], elements: [] }, { spaces: 4 })
    }
    const store = createStore({
        initial: readJSONSync(path) as RedoData,
        handler: (data) => writeJsonSync(path, data, { spaces: 4 })
    })
    const getElements = () => store.query({ elements: true }).elements
    const createElement = (data: Element) =>
        store.mutate({ elements: (_) => _.concat(data) })
    return {
        createTest: (data: Test) => {
            data.steps = data.steps.map((step) => {
                if ("selector" in step) {
                    const { selector, ...data } = step
                    const existingElement = getElements().find(
                        (element) => element.selector === selector
                    )
                    if (existingElement) {
                        return { ...data, id: existingElement.id }
                    }
                    const id = v4()
                    createElement({ selector, id })
                    return { ...data, id } as any
                }
            })
            store.mutate({ tests: (_) => _.concat(data as any) })
        },
        getTests: () => store.query({ tests: true }).tests,
        createElement: getElements,
        testToSteps: (test: StoredTest): Step[] =>
            test.steps.map((step) => {
                if (step.element) {
                    const { element, ...data } = step
                    const storedElement = getElements().find(
                        (storedElement) => storedElement.id === element
                    )
                    if (!storedElement) {
                        throw new Error(
                            `Element with id ${element} does not exist.`
                        )
                    }
                    return {
                        ...data,
                        id: storedElement.id
                    }
                }
                return step as any
            })
    }
}
