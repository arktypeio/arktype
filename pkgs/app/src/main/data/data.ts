import { TestData, Test, ElementData, StepData } from "@re-do/model"
import { Step } from "@re-do/test"
import { Store } from "react-statelessly"
import {
    readJSONSync,
    writeJsonSync,
    existsSync,
    writeJSONSync
} from "fs-extra"
import { join } from "path"
import { RedoData } from "common"
import { deepEquals } from "@re-do/utils"

export type LoadDataArgs = {
    path: string
}

const defaultRedoData = { tests: [], elements: [], steps: [] }

const getRedoData = (path: string) => {
    if (!existsSync(path)) {
        writeJSONSync(path, defaultRedoData, { spaces: 4 })
        return defaultRedoData
    }
    return readJSONSync(path) as RedoData
}

export const loadData = ({ path }: LoadDataArgs) =>
    new Store(
        getRedoData(path),
        {
            reload: () => getRedoData(path)
        },
        {
            onChange: (changes) => {
                const stored = getRedoData(path)
                writeJsonSync(path, { ...stored, ...changes }, { spaces: 4 })
            }
        }
    )

export const data = loadData({ path: join(process.cwd(), "redo.json") })

export const testToSteps = (test: TestData): Step[] =>
    test.steps.map((stepId) => {
        const step = data.get("steps").find((_) => _.id === stepId)
        if (!step) {
            throw new Error(`Step with id ${stepId} does not exist.`)
        }
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

export const getNextId = (existing: { id: number }[]) =>
    existing.reduce(
        (maxId, currentElement) =>
            currentElement.id > maxId ? currentElement.id : maxId,
        0
    ) + 1

export const createSteps = (steps: Step[]): number[] => {
    const existingSteps = data.get("steps")
    return steps.map((step) => {
        const matchingStep = existingSteps.find((existing) => {
            const { id, element: elementId, ...rest } = existing
            if (elementId && "selector" in step) {
                const elementData = data
                    .get("elements")
                    .find((element) => element.id === elementId)
                if (!elementData) {
                    throw new Error(
                        `Element with id ${elementId} does not exist.`
                    )
                }
                return deepEquals(
                    { selector: elementData.selector, ...rest },
                    step
                )
            }
            return deepEquals(rest, step)
        })
        if (matchingStep) {
            return matchingStep.id
        }
        const stepId = getNextId(existingSteps)
        if ("selector" in step) {
            const { selector, ...rest } = step
            const existingElements = data.get("elements")
            const matchingElement = existingElements.find(
                (element) => element.selector === selector
            )
            if (matchingElement) {
                const newStep = {
                    ...rest,
                    element: matchingElement.id,
                    id: stepId
                }
                data.update({ steps: (_) => _.concat(newStep) })
                existingSteps.push(newStep)
                return stepId
            }

            const elementId = getNextId(existingElements)
            data.update({
                elements: (_) => _.concat({ selector, id: elementId })
            })
            const newStep = {
                ...rest,
                element: elementId,
                id: stepId
            }
            data.update({ steps: (_) => _.concat(newStep) })
            existingSteps.push(newStep)
            return stepId
        } else {
            const newStep = { ...step, id: stepId }
            data.update({ steps: (_) => _.concat(newStep) })
            existingSteps.push(newStep)
            return stepId
        }
    })
}
