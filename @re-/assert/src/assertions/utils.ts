/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
import { strict } from "node:assert"
import { AssertionContext } from "../assert.js"

export const callAssertedFunction = (
    asserted: Function,
    ctx: AssertionContext
): AssertedFnCallResult => {
    const result: AssertedFnCallResult = {}
    try {
        result.returned = asserted(...ctx.assertedFnArgs)
    } catch (error) {
        result.threw = String(error)
    }
    return result
}

export const getThrownMessage = (result: AssertedFnCallResult) => {
    if (!("threw" in result)) {
        throw new strict.AssertionError({
            message: "Function didn't throw."
        })
    }
    return result.threw
}

type AssertedFnCallResult = {
    returned?: unknown
    threw?: string
}
