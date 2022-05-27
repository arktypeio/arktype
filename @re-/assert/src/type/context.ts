import { deepEqual } from "node:assert/strict"
import { AssertionContext } from "../assert.js"
import { SourcePosition } from "../common.js"
import {
    benchAssertions,
    BenchAssertions,
    chainableAssertion,
    ChainableValueAssertion
} from "../value/index.js"
import { getAssertionData } from "./analysis.js"

export type ValueFromTypeAssertion<
    Expected,
    IsBenchable extends boolean,
    Chained = Expected
> = ChainableValueAssertion<
    [expected: Expected],
    false,
    IsBenchable,
    Chained,
    false
>

export type TypeAssertions<IsBenchable extends boolean> = {
    type: {
        toString: ValueFromTypeAssertion<string, IsBenchable>
        errors: ValueFromTypeAssertion<string | RegExp, IsBenchable, string>
    }
    typed: unknown
} & (IsBenchable extends true ? BenchAssertions : {})

export type AssertTypeContext<IsBenchable extends boolean> = (
    position: SourcePosition,
    config: AssertionContext
) => TypeAssertions<IsBenchable>

export const typeAssertions: AssertTypeContext<boolean> = (
    position: SourcePosition,
    ctx: AssertionContext
) => {
    return new Proxy(
        {
            type: {
                toString: chainableAssertion(
                    position,
                    () => getAssertionData(position).type.actual,
                    { ...ctx, allowTypeAssertions: false }
                ),
                errors: chainableAssertion(
                    position,
                    () => getAssertionData(position).errors,
                    { ...ctx, allowTypeAssertions: false },
                    { allowRegex: true }
                )
            },
            ...benchAssertions(ctx)
        },
        {
            get: (target, prop) => {
                if (prop === "typed") {
                    const assertionData = getAssertionData(position)
                    if (!assertionData.type.expected) {
                        throw new Error(
                            `Expected an 'as' expression after 'typed' prop access at position ${position.char} on` +
                                `line ${position.line} of ${position.file}.`
                        )
                    }
                    deepEqual(
                        assertionData.type.actual,
                        assertionData.type.expected
                    )
                }
                return (target as any)[prop]
            }
        }
    ) as any
}
