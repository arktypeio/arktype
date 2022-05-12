import { SourcePosition } from "../positions.ts"
import { nextTypeToString, errorsOfNextType } from "./types.ts"
import {
    chainableAssertion,
    ChainableValueAssertion
} from "../value/context.ts"
import { AssertionConfig } from "../assert.ts"
import * as testing from "@deno/testing"

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
                    testing.assertEquals(
                        nextTypeToString(position, {
                            returnsCount: config.returnsCount
                        }),
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
