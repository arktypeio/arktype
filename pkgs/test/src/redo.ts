import { createRedoFileDb } from "@re-do/model"
import { test } from "@re-do/run"

export type RedoArgs = {
    id: number
}

export const redo = async ({ id }: RedoArgs) => {
    const data = createRedoFileDb({})
    const { steps } = data.tests.find((test) => test.id === id)
    await test(steps)
}
