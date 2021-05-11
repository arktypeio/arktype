import { StoredTest, Test, Element } from "@re-do/model"
import { Step } from "@re-do/test"
import { createStore } from "react-statelessly"
import {
    readJSONSync,
    writeJsonSync,
    existsSync,
    writeJSONSync
} from "fs-extra"

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
        handler: (data) => {
            const stored = readJSONSync(path)
            writeJsonSync(path, { ...stored, ...data }, { spaces: 4 })
        }
    })
    const getElements = () => store.query({ elements: true }).elements
    const createElement = (data: Element) =>
        store.update({ elements: (_) => _.concat(data) })
    const createTest = ({ steps, ...data }: Test) => {
        const storedSteps = steps.map((step) => {
            if ("selector" in step) {
                const { selector, ...data } = step
                const existingElements = getElements()
                const matchingElement = existingElements.find(
                    (element) => element.selector === selector
                )
                if (matchingElement) {
                    return { ...data, element: matchingElement.id }
                }
                // Set id to one more than max existing ID
                const id =
                    existingElements.reduce(
                        (maxId, currentElement) =>
                            currentElement.id > maxId
                                ? currentElement.id
                                : maxId,
                        0
                    ) + 1
                createElement({ selector, id })
                return { ...data, element: id } as any
            }
        })
        store.update({
            tests: (_) =>
                _.concat({
                    ...data,
                    steps: storedSteps
                })
        })
    }
    const getTests = () => store.query({ tests: true }).tests
    const testToSteps = (test: StoredTest): Step[] =>
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
                    selector: storedElement.selector
                }
            }
            return step as any
        })
    return {
        createTest,
        getTests,
        createElement,
        getElements,
        testToSteps
    }
}
