import { SourcePosition, withCallPosition } from "@re-do/node"
import { nextTypeToString, errorsOfNextType } from "./types.js"
import { expect } from "@jest/globals"
import {
    chainableAssertion,
    ChainableValueAssertion,
    valueAssertions
} from "../value/context.js"

export type ValueFromTypeAssertion<
    Expected,
    ChainedAs = Expected
> = ChainableValueAssertion<
    [expected: Expected],
    { allowTypeAssertions: false },
    ChainedAs
>

export type TypeAssertions = {
    type: {
        toString: ValueFromTypeAssertion<string>
        errors: ValueFromTypeAssertion<string>
    }
    typed: unknown
}

export type AssertTypeContext = (position: SourcePosition) => TypeAssertions

// assert(dofsh).is(500)
// assert(dofsh).hasTypedValue(500 as number)
// assert({}).equals(500).typed as number
// assert(() => () => ({})).returns.returns({})
// assert((s: number) => "").args(5)
// assert(dofsh).type() as number
// assert(dofsh).type.errors([])
// assert(dofsh).type.toString("number")
// assert(dofsh).type.toString.snap()
// assert(dofsh).type.toString("")

export const typeAssertions: AssertTypeContext = (position: SourcePosition) => {
    return new Proxy(
        {
            type: {
                toString: chainableAssertion(
                    position,
                    () => nextTypeToString(position),
                    { allowTypeAssertions: false }
                ),
                errors: chainableAssertion(
                    position,
                    () => errorsOfNextType(position),
                    { allowTypeAssertions: false }
                )
            }
        },
        {
            get: withCallPosition((propPosition, target, prop) => {
                if (prop === "typed") {
                    expect(nextTypeToString(position)).toBe(
                        // Skip the type of "typed" to get the cast value
                        nextTypeToString(propPosition, { skipPositions: 5 })
                    )
                }
                return target[prop]
            })
        }
    ) as any
}
