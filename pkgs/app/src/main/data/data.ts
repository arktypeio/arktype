import { StoredTest, Test, Element, StoredStep } from "@re-do/model"
import { Step } from "@re-do/test"
import { Actions, Store } from "react-statelessly"
import {
    readJSONSync,
    writeJsonSync,
    existsSync,
    writeJSONSync
} from "fs-extra"
import { join } from "path"
import { RedoData } from "common"

export type LoadDataArgs = {
    path: string
}

export const loadData = ({ path }: LoadDataArgs) => {
    if (!existsSync(path)) {
        writeJSONSync(path, { tests: [], elements: [] }, { spaces: 4 })
    }
    return new Store(
        readJSONSync(path) as RedoData,
        {
            reload: () => {
                return readJSONSync(path)
            }
        },
        {
            onChange: (changes) => {
                const stored = readJSONSync(path)
                writeJsonSync(path, { ...stored, ...changes }, { spaces: 4 })
            }
        }
    )
}

export const data = loadData({ path: join(process.cwd(), "redo.json") })

export const testToSteps = (test: StoredTest): Step[] =>
    test.steps.map((step) => {
        if (step.element) {
            const { element, ...rest } = step
            const storedElement = data
                .get("elements")
                .find((storedElement) => storedElement.id === element)
            if (!storedElement) {
                throw new Error(`Element with id ${element} does not exist.`)
            }
            return {
                ...rest,
                selector: storedElement.selector
            }
        }
        return step as any
    })

export const createSteps = (steps: Step[]) =>
    steps.map((step) => {
        if ("selector" in step) {
            const { selector, ...rest } = step
            const existingElements = data.get("elements")
            const matchingElement = existingElements.find(
                (element) => element.selector === selector
            )
            if (matchingElement) {
                return { ...rest, element: matchingElement.id }
            }
            // Set id to one more than max existing ID
            const id =
                existingElements.reduce(
                    (maxId, currentElement) =>
                        currentElement.id > maxId ? currentElement.id : maxId,
                    0
                ) + 1
            data.update({ elements: (_) => _.concat({ selector, id }) })
            return { ...rest, element: id }
        } else {
            return step as StoredStep
        }
    })
