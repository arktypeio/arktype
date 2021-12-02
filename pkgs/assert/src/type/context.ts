import { SourceRange, withCallRange } from "@re-do/node"
import { typeErrorChecker, TypeErrorsOptions } from "./errors.js"
import { CheckTypesOptions, typeChecker } from "./types.js"
import { expect } from "@jest/globals"
import { assertionContext } from "../check.js"
import { ChainableValueAssertion, ValueAssertion } from "../value/context.js"

export type TypeContext = ReturnType<typeof typeContext>

export const typeContext = (range: SourceRange, value: unknown) => {
    const getTypes = typeChecker(range)
    return Object.assign(getTypes, { errors: typeErrorsContext(range, value) })
}

export const typeOf = withCallRange(typeContext)

export const typeErrorsContext = (range: SourceRange, value: unknown) =>
    typeErrorChecker(range)

export const typeErrorsOf = withCallRange(typeErrorsContext)

export type ValueFromTypeAssertion<Expected> = ChainableValueAssertion<
    [expected: Expected],
    { allowTypeAssertions: false }
>

export type TypeAssertions = {
    type: {
        toString: ValueFromTypeAssertion<string>
        errors: ValueFromTypeAssertion<string[]>
    }
    typed: unknown
}

// assert(dofsh).is(500)
// assert(dofsh).hasValueAndType(500 as number)
// assert(dofsh).equals(500).typed as number
// assert(dofsh).typed as number
// assert(dofsh).type.errors([])
// assert(dofsh).type.snapshot("number")

export type AssertTypeContext = (range: SourceRange) => TypeAssertions

export const typeAssertions: AssertTypeContext = (range: SourceRange) => {
    return {} as any
    // const assertType = <Equals extends string | undefined = undefined>(
    //     equals?: Equals,
    //     options: CheckTypesOptions = {}
    // ) => {
    //     const typeSnapshot = typeChecker(range)(options)
    //     if (equals) {
    //         expect(typeSnapshot.replace(/\s/g, "")).toBe(
    //             equals.replace(/\s/g, "")
    //         )
    //     }
    //     return equals ? assertionContext(range, value) : expect(typeSnapshot)
    // }
    // const assertTypeErrors = <Equals extends string[] | undefined = undefined>(
    //     equals?: Equals,
    //     options?: TypeErrorsOptions
    // ) => {
    //     const matcher = expect(typeErrorsContext(range, value)(options))
    //     if (equals) {
    //         matcher.toStrictEqual(equals)
    //     }
    //     return equals ? assertionContext(range, value) : matcher
    // }
    // return Object.assign(assertType, {
    //     errors: assertTypeErrors
    // }) as any
}
