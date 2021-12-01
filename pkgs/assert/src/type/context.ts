import { SourceRange, withCallRange } from "@re-do/node"
import { Func } from "@re-do/utils"
import { getTypeErrors, typeErrorChecker, TypeErrorsOptions } from "./errors.js"
import { CheckTypesOptions, typeChecker } from "./types.js"
import { expect } from "@jest/globals"
import {
    Assertion,
    assertionContext,
    ChainableAssertion,
    Matcher
} from "../check.js"

export type TypeContext = ReturnType<typeof typeContext>

export const typeContext = (range: SourceRange, value: unknown) => {
    const getTypes = typeChecker(range)
    return Object.assign(getTypes, { errors: typeErrorsContext(range, value) })
}

export const typeOf = withCallRange(typeContext)

export const typeErrorsContext = (range: SourceRange, value: unknown) =>
    typeErrorChecker(range)

export const typeErrorsOf = withCallRange(typeErrorsContext)

export type AssertTypeContext<T> = ChainableAssertion<
    T,
    string,
    CheckTypesOptions
> & {
    errors: ChainableAssertion<T, string[], TypeErrorsOptions>
}

export const assertTypeContext = (range: SourceRange, value: unknown) => {
    const assertType = <Equals extends string | undefined = undefined>(
        equals?: Equals,
        options: CheckTypesOptions = {}
    ) => {
        const matcher = expect(typeChecker(range)(options).replace(/\s/g, ""))
        if (equals) {
            matcher.toBe(equals.replace(/\s/g, ""))
        }
        return equals ? assertionContext(range, value) : matcher
    }
    const assertTypeErrors = <Equals extends string[] | undefined = undefined>(
        equals?: Equals,
        options?: TypeErrorsOptions
    ) => {
        const matcher = expect(typeErrorsContext(range, value)(options))
        if (equals) {
            matcher.toStrictEqual(equals)
        }
        return equals ? assertionContext(range, value) : matcher
    }
    return Object.assign(assertType, {
        errors: assertTypeErrors
    })
}
