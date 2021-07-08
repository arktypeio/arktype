import { createRedoFileDb, Test } from "@re-do/model"
import { test } from "@re-do/run"
import { WithIds } from "persist-statelessly"

const db = createRedoFileDb({})

export type RedoArgs = {
    id: number
}

export const run = async ({ id }: RedoArgs) => {
    const { steps } = db.tests.find((test) => test.id === id)
    await test(steps)
}

export const getTests = (): WithIds<Test, "id">[] => db.tests.all()
