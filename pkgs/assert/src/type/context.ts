import { SourcePosition } from "@re-do/node"
import { nextTypeToString, errorsOfNextType } from "./types.js"
import { expect } from "@jest/globals"
import {
    chainableAssertion,
    ChainableValueAssertion
} from "../value/context.js"
import { AssertionConfig } from "../assert.js"

export type ValueFromTypeAssertion<
    Expected,
    Chained = Expected
> = ChainableValueAssertion<
    [expected: Expected],
    { allowTypeAssertions: false; returnsCount: 0 },
    Chained,
    false
>

export type TypeAssertions = {
    type: {
        toString: ValueFromTypeAssertion<string>
        errors: ValueFromTypeAssertion<string | RegExp, string>
    }
    typed: unknown
}

export type AssertTypeContext = (
    position: SourcePosition,
    config: AssertionConfig
) => TypeAssertions

export const typeAssertions: AssertTypeContext = (
    position: SourcePosition,
    config: AssertionConfig
) => {
    return new Proxy(
        {
            type: {
                toString: chainableAssertion(
                    position,
                    () =>
                        nextTypeToString(position, {
                            returnsCount: config.returnsCount
                        }),
                    { ...config, allowTypeAssertions: false }
                ),
                errors: chainableAssertion(
                    position,
                    () => errorsOfNextType(position),
                    { ...config, allowTypeAssertions: false },
                    { allowRegex: true }
                )
            }
        },
        {
            get: (target, prop) => {
                if (prop === "typed") {
                    expect(
                        nextTypeToString(position, {
                            returnsCount: config.returnsCount
                        })
                    ).toBe(
                        // Offset back to the original assert and cast expression
                        nextTypeToString(position, {
                            findParentMatching: (node) =>
                                /[\s\S]*\.typed[\s\S]*as/.test(node.getText())
                        })
                    )
                }
                return (target as any)[prop]
            }
        }
    ) as any
}
