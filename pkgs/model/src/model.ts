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

export type LoadStoreArgs = {
    path: string
}

export type RedoStore = {
    tests: Test[]
}

export const loadStore = ({ path }: LoadStoreArgs) => {
    if (!existsSync(path)) {
        writeJSONSync(path, { tests: [] })
    }
    const store = createStore({
        initial: readJSONSync(path) as RedoStore,
        handler: (data) => writeJsonSync(path, data, { spaces: 4 })
    })
    return {
        createTest: (data: Test) =>
            store.mutate({ tests: (_) => _.concat(data) }),
        getTests: () => store.query({ tests: true }).tests
    }
}
