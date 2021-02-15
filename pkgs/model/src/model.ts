import { Step } from "@re-do/test"
import { createStore } from "statelessly"
import {
    readJSONSync,
    writeJsonSync,
    existsSync,
    writeJSONSync
} from "fs-extra"

export type Test = {
    name: string
    steps: Step[]
    tags: string[]
}

export type Element = {
    id: number
    selector: string
}

export type LoadStoreArgs = {
    path: string
}

export type RedoStore = {
    tests: Test[]
    elements: Element[]
}

export const loadStore = ({ path }: LoadStoreArgs) => {
    if (!existsSync(path)) {
        writeJSONSync(path, { tests: [], elements: [] }, { spaces: 4 })
    }
    const store = createStore({
        initial: readJSONSync(path) as RedoStore,
        handler: (data) => writeJsonSync(path, data, { spaces: 4 })
    })
    return {
        createTest: (data: Test) =>
            store.mutate({ tests: (_) => _.concat(data) }),
        getTests: () => store.query({ tests: true }).tests,
        createElement: (data: Element) =>
            store.mutate({ elements: (_) => _.concat(data) }),
        getElements: () => store.query({ elements: true }).elements
    }
}
