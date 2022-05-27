import { deepEqual } from "node:assert/strict"
import { AssertionContext } from "../assert.js"
import { SourcePosition } from "../common.js"
import { chainableAssertion, ChainableValueAssertion } from "../value/index.js"
import { getAssertionData } from "./analysis.js"

export type ValueFromTypeAssertion<
    Expected,
    Chained = Expected
> = ChainableValueAssertion<[expected: Expected], false, Chained, false>

export type TypeAssertions = {
    type: {
        toString: ValueFromTypeAssertion<string>
        errors: ValueFromTypeAssertion<string | RegExp, string>
    }
    typed: unknown
}

export type AssertTypeContext = (
    position: SourcePosition,
    config: AssertionContext
) => TypeAssertions

export const typeAssertions: AssertTypeContext = (
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
            }
        },
        {
            get: (target, prop) => {
                if (prop === "typed") {
                    const assertionData = getAssertionData(position)
                    if (!assertionData.type.expected) {
                        throw new Error(
                            `Expected an 'as' expression after 'typed' prop access at position ${position.char} on ` +
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
