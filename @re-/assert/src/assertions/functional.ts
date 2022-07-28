/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
import { strict } from "node:assert"
import { Fn } from "@re-/tools"
import { AssertionContext } from "../assert.js"
import { getAssertionAtPos } from "../type/index.js"

export type CallableFunctionAssertions<
    Return,
    AllowTypeAssertions extends boolean
> = {
    returns: ChainableValueAssertion<
        [value: Return],
        AllowTypeAssertions,
        Return,
        true
    >
    throws: ChainableValueAssertion<
        [message: string | RegExp],
        AllowTypeAssertions,
        string,
        false
    >
} & (AllowTypeAssertions extends true
    ? {
          throwsAndHasTypeError: (message: string | RegExp) => undefined
      }
    : {})

export type FunctionAssertions<
    Args extends any[],
    Return,
    AllowTypeAssertions extends boolean
> = ([] extends Args
    ? CallableFunctionAssertions<Return, AllowTypeAssertions>
    : {}) &
    (Args extends []
        ? {}
        : {
              args: (
                  ...args: Args
              ) => CallableFunctionAssertions<Return, AllowTypeAssertions>
          })

const getThrownMessage = (result: AssertedFnCallResult) => {
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

const currentAssertions = {
    args: (...args: any[]) =>
        valueAssertions({
            ...ctx,
            assertedFnArgs: args
        }),
    returns: createChainableAssertFn({
        ...ctx,
        isReturn: true,
        actualValueThunk: () => {
            const result = callAssertedFunction(actual as Fn, ctx)
            if (!("returned" in result)) {
                throw new strict.AssertionError({
                    message: result.threw
                })
            }
            return result.returned
        }
    }),
    throws: createChainableAssertFn({
        ...ctx,
        allowRegex: true,
        defaultExpected: "",
        actualValueThunk: () =>
            getThrownMessage(callAssertedFunction(actual as Fn, ctx))
    }),
    throwsAndHasTypeError: (matchValue: string | RegExp) => {
        defaultAssert(
            getThrownMessage(callAssertedFunction(actual as Fn, ctx)),
            matchValue,
            true
        )
        if (!ctx.cfg.skipTypes) {
            defaultAssert(getAssertionAtPos(position).errors, matchValue, true)
        }
    }
}
