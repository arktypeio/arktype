/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
import { ListComparisonMode } from "@re-/tools"
import { AssertionContext } from "../assert.js"

export type NextAssertions<AllowTypeAssertions extends boolean> =
    AllowTypeAssertions extends true ? {} : {}

export type ChainAssertion<
    ArgsType extends [value: any, ...rest: any[]],
    AllowTypeAssertions extends boolean,
    Chained = ArgsType[0],
    IsReturn extends boolean = false,
    ImmediateAssertions = ValueAssertion<Chained, AllowTypeAssertions> &
        (IsReturn extends true ? NextAssertions<AllowTypeAssertions> : {})
> = (<Args extends ArgsType | [] = []>(
    ...args: Args
) => NextAssertions<AllowTypeAssertions>) &
    ImmediateAssertions

export type ChainContext = {
    isReturn?: boolean
    allowRegex?: boolean
    defaultExpected?: unknown
}

export type CallableFunctionAssertions<
    Return,
    AllowTypeAssertions extends boolean
> = {
    returns: ChainAssertion<[value: Return], AllowTypeAssertions, Return, true>
    throws: ChainAssertion<
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

export type ValueFromTypeAssertion<
    Expected,
    Chained = Expected
> = ChainAssertion<[expected: Expected], false, Chained, false>

export type TypeAssertionProps = {
    toString: ValueFromTypeAssertion<string>
    errors: ValueFromTypeAssertion<string | RegExp, string>
}

export type ComparableValueAssertion<T, AllowTypeAssertions extends boolean> = {
    is: (value: T) => NextAssertions<AllowTypeAssertions>
    snap: ((value?: T) => NextAssertions<AllowTypeAssertions>) & {
        toFile: (
            name: string,
            options?: ExternalSnapshotOptions
        ) => NextAssertions<AllowTypeAssertions>
    }
    equals: (
        value: T,
        options?: EqualsOptions
    ) => NextAssertions<AllowTypeAssertions>
    value: Omit<ComparableValueAssertion<unknown, AllowTypeAssertions>, "value">
} & (AllowTypeAssertions extends true
    ? { typedValue: (expected: unknown) => undefined }
    : {})

const createAssertFn =
    (ctx: AssertionContext) =>
    (...args: [expected: unknown]) => {
        let expected
        if (ctx.assertedFnArgs.length) {
            expected = ctx.assertedFnArgs[0]
        } else {
            if ("defaultExpected" in ctx) {
                expected = ctx.defaultExpected
            } else {
                throw new Error(
                    `Assertion call requires an arg representing the expected value.`
                )
            }
        }
        defaultAssert(ctx.actualValueThunk(), expected, ctx.allowRegex)
        return getNextAssertions(ctx)
    }

export const createChainableAssertFn = (ctx: AssertionContext) =>
    new Proxy(createAssertFn(ctx), {
        get: (target, prop) => {
            if (prop in target) {
                return (target as any)[prop]
            }
            const baseAssertions: any = valueAssertions(ctx)
            if (ctx.isReturn) {
                const nextAssertions = getNextAssertions(ctx)
                if (prop in nextAssertions) {
                    return (nextAssertions as any)[prop]
                }
            }
            return baseAssertions[prop]
        }
    })

export type ExternalSnapshotOptions = {
    path?: string
}

export type EqualsOptions = {
    listComparison?: ListComparisonMode
}
