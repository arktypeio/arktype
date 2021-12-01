import { SourceRange, withCallRange } from "@re-do/node"
import { Func, stringify, isRecursible } from "@re-do/utils"
import {
    Assertion,
    assertionContext,
    ChainableAssertion,
    Matcher
} from "../check.js"

export type ValueContext<T> = (() => T) &
    (T extends Func<[]>
        ? {
              throws: () => string | undefined
          }
        : {})

const getThrownMessage = (value: Func<[]>) => {
    try {
        value()
    } catch (e) {
        if (isRecursible(e) && "message" in e) {
            return e.message
        }
        return String(e)
    }
}

export const valueContext = (range: SourceRange, value: any) => {
    const getValue = () => value
    if (typeof value !== "function") {
        return getValue
    }
    const functionProps: Partial<ValueContext<Func>> = {
        throws: () => getThrownMessage(value)
    }
    return Object.assign(getValue, functionProps)
}

export type AssertValueContext<T> = ChainableAssertion<T, any, {}> &
    (T extends Func<[]>
        ? {
              throws: ChainableAssertion<T, string, {}>
          }
        : {})

export const assertValueContext = (range: SourceRange, value: unknown) => {
    const assertValue = (equals?: any) => {
        const matcher = expect(value)
        if (equals) {
            matcher.toStrictEqual(equals)
        }
        return equals ? assertionContext(range, value) : matcher
    }
    const assertThrows = (message?: string) => {
        const matcher = expect(getThrownMessage(value as any))
        if (message) {
            matcher.toBe(message)
        }
        return message ? assertionContext(range, value) : matcher
    }
    if (typeof value === "function" && !value.length) {
        return Object.assign(assertValue, {
            throws: assertThrows
        })
    }
    return assertValue
}
