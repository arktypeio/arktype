import { strict } from "node:assert"

export const defaultAssert = (
    actual: unknown,
    expected: unknown,
    allowRegex = false
) => {
    if (allowRegex) {
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
    } else {
        assertEquals(expected, actual)
    }
}
