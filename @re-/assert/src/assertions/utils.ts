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

export const assertEqualOrMatching = (expected: unknown, actual: unknown) => {
    if (typeof actual !== "string") {
        throw new strict.AssertionError({
            message: `Value was of type ${typeof actual} (expected a string).`,
            actual,
            expected
        })
    }
    if (typeof expected === "string") {
        if (!actual.includes(expected)) {
            throw new strict.AssertionError({
                message: `Expected string '${expected}' did not appear in actual string '${actual}'.`,
                actual,
                expected
            })
        }
    } else if (expected instanceof RegExp) {
        strict.match(actual, expected)
    } else {
        throw new strict.AssertionError({
            message: `Expected value for this assertion should be a string or RegExp.`,
            expected,
            actual
        })
    }
}
