import { strict } from "node:assert"
import type { DiffOptions } from "@re-/tools"
import { diff, isRecursible, toString } from "@re-/tools"
import type { AssertionContext } from "./assert.js"

export type ThrowAsertionErrorContext = {
    message: string
    expected?: unknown
    actual?: unknown
    ctx: AssertionContext
}

export const throwAssertionError = ({
    ctx,
    ...errorArgs
}: ThrowAsertionErrorContext): never => {
    const e = new strict.AssertionError(errorArgs)
    e.stack = ctx.assertionStack
    throw e
}

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
        throwAssertionError({
            message: `Values differed at the following paths:\n${toString(
                changes,
                { indent: 2 }
            )}`,
            expected,
            actual,
            ctx
        })
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
    } else if (actual !== expected) {
        throwAssertionError({
            message: `${actual}!==${expected}`,
            expected,
            actual,
            ctx
        })
    }
}
