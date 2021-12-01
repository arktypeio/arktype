import { SourceRange, withCallRange } from "@re-do/node"
import { Func } from "@re-do/utils"
import {
    assertTypeContext,
    TypeAssertion,
    TypeContext,
    typeContext
} from "./type"
import {
    assertValueContext,
    ValueAssertion,
    ValueContext,
    valueContext
} from "./value"

export type CheckResult<T> = { type: TypeContext; value: ValueContext<T> }

export type Checker = <T>(value: T) => CheckResult<T> & (() => CheckResult<T>)

export const context = (range: SourceRange, value: unknown) => {
    return {
        type: typeContext(range, value),
        value: valueContext(range, value)
    }
}

export const check = withCallRange(context) as any as Checker

export type FromChecker = <T, Callback extends Func<[result: CheckResult<T>]>>(
    value: T
) => CheckResult<T> & Func<[callback: Callback], ReturnType<Callback>>

export const from = withCallRange(context, {
    allCallback: true
}) as any as FromChecker

export type Matcher = ReturnType<typeof expect>

export type ChainableAssertion<T, EqualsType, Options> = <
    Equals extends EqualsType | undefined = undefined
>(
    equals?: Equals,
    options?: Options
) => Equals extends undefined ? Matcher : AssertionResult<T>

export type AssertionResult<T> = {
    type: TypeAssertion<T>
    value: ValueAssertion<T>
}

export type Assertion = <T>(value: T) => AssertionResult<T>

export type AssertionContext = <T>(
    range: SourceRange,
    value: T
) => AssertionResult<T>

export const assertionContext: AssertionContext = (
    range: SourceRange,
    value: unknown
) => {
    return {
        type: assertTypeContext(range, value),
        value: assertValueContext(range, value)
    } as any
}

export const assert = withCallRange(assertionContext) as any as Assertion
