import { Test } from "@re-do/model"
import { test as runTest } from "@re-do/run"
import { createRedoFileDb } from "@re-do/data"
import { WithIds } from "persist-statelessly"

const db = createRedoFileDb({})

export type RedoArgs = {
    id: number
}

export const run = async ({ id }: RedoArgs) => {
    const { steps } = db.tests.find((test) => test.id === id)
    await runTest(steps)
}

export const getTests = (): WithIds<Test, "id">[] => db.tests.all()
