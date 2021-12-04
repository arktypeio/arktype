import { SourcePosition, withCallPosition } from "@re-do/node"
import { nextTypeToString, errorsOfNextType } from "./types.js"
import { expect } from "@jest/globals"
import {
    chainableAssertion,
    ChainableValueAssertion
} from "../value/context.js"
import { AssertionConfig } from "../assert.js"

export type ValueFromTypeAssertion<Expected> = ChainableValueAssertion<
    [expected: Expected],
    { allowTypeAssertions: false; returnsCount: 0 },
    false
>

export type TypeAssertions = {
    type: {
        toString: ValueFromTypeAssertion<string>
        errors: ValueFromTypeAssertion<string>
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
                    { ...config, allowTypeAssertions: false }
                )
            }
        },
        {
            get: withCallPosition((propPosition, target, prop) => {
                if (prop === "typed") {
                    expect(
                        nextTypeToString(position, {
                            returnsCount: config.returnsCount
                        })
                    ).toBe(
                        // Skip the type of "typed" to get the cast value
                        nextTypeToString(propPosition, {
                            skipPositions: 5
                        })
                    )
                }
                return target[prop]
            })
        }
    ) as any
}
