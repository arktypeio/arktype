import { StoredTest, Test, Element, StoredStep } from "@re-do/model"
import { Step } from "@re-do/test"
import { Actions, Store } from "react-statelessly"
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

const defineActions = <A extends Actions<RedoData>>(actions: A) => actions

const actions = defineActions({
    createElement: (data: Element) => ({
        elements: (_) => _.concat(data)
    })
})

type RedoDataActions = typeof actions

let store: Store<RedoData, RedoDataActions>

export const loadStore = ({ path }: LoadStoreArgs) => {
    if (!existsSync(path)) {
        writeJSONSync(path, { tests: [], elements: [] }, { spaces: 4 })
    }
    store = new Store(readJSONSync(path) as RedoData, actions, {
        onChange: (data) => {
            const stored = readJSONSync(path)
            writeJsonSync(path, { ...stored, ...data }, { spaces: 4 })
        }
    })
    const getElements = () => store.query({ elements: true }).elements
    const createTest = ({ steps, ...data }: Test): StoredTest => {
        const storedSteps: StoredStep[] = steps.map((step) => {
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
                store.$.createElement({ selector, id })
                return { ...data, element: id }
            } else {
                return step as StoredStep
            }
        })
        const test = {
            ...data,
            steps: storedSteps
        }
        store.update({
            tests: (_) => [..._, test]
        })
        return test
    }
    const getTests = () => store.get("tests")
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
        getElements,
        testToSteps
    }
}
