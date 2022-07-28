/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
import { ListComparisonMode } from "@re-/tools"
import { AssertionContext } from "../assert.js"
import { TypeAssertions } from "../type/index.js"

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

export const getNextAssertions = (ctx: AssertionContext) =>
    ctx.allowTypeAssertions ? new TypeAssertions(ctx) : {}
