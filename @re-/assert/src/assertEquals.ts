import { AssertionError, strict } from "node:assert"
import { diff, DiffOptions, isRecursible, toString } from "@re-/tools"
import { AssertionContext } from "./assert.js"

export type AssertEqualsContext = AssertionContext & {
    options?: DiffOptions
}

export const assertDeepEquals = (
    expected: unknown,
    actual: unknown,
    ctx: AssertEqualsContext
) => {
    const changes = diff(expected, actual, ctx.options)
    if (changes) {
        const e = new strict.AssertionError({
            message: `Values differed at the following paths:\n${toString(
                changes,
                { indent: 2 }
            )}`,
            expected,
            actual
        })
        e.stack = ctx.assertionStack
        throw e
    }
}

export const assertEquals = (
    expected: unknown,
    actual: unknown,
    ctx: AssertEqualsContext
) => {
    if (isRecursible(expected) && isRecursible(actual)) {
        assertDeepEquals(expected, actual, {
            ...ctx,
            options: {
                ...ctx.options,
                baseKey: "expected",
                compareKey: "actual"
            }
        })
    } else {
        try {
            strict.equal(actual, expected)
        } catch (e) {
            if (e instanceof AssertionError) {
                e.stack = ctx.assertionStack
            }
            throw e
        }
    }
}
