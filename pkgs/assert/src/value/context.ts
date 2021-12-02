import { SourceRange, withCallRange } from "@re-do/node"
import { Func, isRecursible, NonRecursible } from "@re-do/utils"
import { AssertionConfig } from "../check.js"
import { TypeAssertions, typeAssertions } from "../type/context.js"

const getThrownMessage = (value: Function) => {
    try {
        value()
    } catch (e) {
        if (isRecursible(e) && "message" in e) {
            return e.message
        }
        return String(e)
    }
}

export type ChainableValueAssertion<
    ArgsType extends [value: any, ...rest: any[]],
    Config extends AssertionConfig
> = (<Args extends ArgsType | [] = []>(
    ...args: Args
) => Args extends []
    ? ValueAssertion<ArgsType[0], Config>
    : NextAssertions<Config>) &
    ValueAssertion<ArgsType[0], Config>

export type BaseValueAssertion<T, Config extends AssertionConfig> = {
    is: (value: T) => NextAssertions<Config>
    snap: (value?: string) => NextAssertions<Config>
}

export type RecursibleValueAssertion<
    T,
    Config extends AssertionConfig
> = BaseValueAssertion<T, Config> & {
    equals: (value: T) => NextAssertions<Config>
}

export type CallableFunctionAssertion<
    Return,
    Config extends AssertionConfig
> = {
    returns: ChainableValueAssertion<[value: Return], Config>
    throws: ChainableValueAssertion<[message: string], Config>
}

export type FunctionalValueAssertion<
    Args extends any[],
    Return,
    Config extends AssertionConfig
> = ([] extends Args ? CallableFunctionAssertion<Return, Config> : {}) &
    (Args extends []
        ? {}
        : {
              args: (...args: Args) => CallableFunctionAssertion<Return, Config>
          })

export type NextAssertions<Config extends AssertionConfig> =
    Config["allowTypeAssertions"] extends true ? TypeAssertions : undefined

export type ValueAssertion<T, Config extends AssertionConfig> = T extends Func<
    infer Args,
    infer Return
>
    ? FunctionalValueAssertion<Args, Return, Config>
    : T extends NonRecursible
    ? BaseValueAssertion<T, Config>
    : RecursibleValueAssertion<T, Config>

const defaultAssert = (value: unknown, expected: unknown) =>
    isRecursible(value)
        ? expect(value).toStrictEqual(expected)
        : expect(value).toBe(expected)

export const valueAssertion = <T, Config extends AssertionConfig>(
    range: SourceRange,
    value: T,
    config: Config
): ValueAssertion<T, Config> => {
    const nextAssertions = config.allowTypeAssertions
        ? typeAssertions(range)
        : undefined
    if (typeof value === "function") {
        return {
            args: (...args: any[]) =>
                valueAssertion(range, () => value(...args), config),
            returns: (...args: any[]) => {
                const result = value()
                if (!args.length) {
                    return valueAssertion(range, result, config)
                }
                defaultAssert(value, args[0])
                return nextAssertions
            },
            throws: (...args: any[]) => {
                const message = getThrownMessage(value)
                if (!args.length) {
                    return valueAssertion(range, message, config)
                }
                defaultAssert(value, args[0])
                return nextAssertions
            }
        } as any
    }
    const baseAssertions: BaseValueAssertion<T, any> = {
        is: (expected: unknown) => {
            expect(value).toBe(expected)
            return nextAssertions
        },
        snap: withCallRange(
            (range: SourceRange, ...args: [expected?: string]) => {
                if (args.length) {
                    defaultAssert(value, args[0])
                } else {
                    // TODO: Add source write
                }
                return nextAssertions
            }
        )
    }
    if (isRecursible(value)) {
        const recursibleAssertions: RecursibleValueAssertion<T, any> = {
            ...baseAssertions,
            equals: (expected: unknown) => {
                expect(value).toStrictEqual(expected)
                return nextAssertions
            }
        }
        return recursibleAssertions as any
    }
    return baseAssertions as any
}
