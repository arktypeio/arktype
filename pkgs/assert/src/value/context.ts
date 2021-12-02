import { SourcePosition, withCallPosition } from "@re-do/node"
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
    Config extends AssertionConfig,
    ChainedAs = ArgsType[0]
> = (<Args extends ArgsType | [] = []>(
    ...args: Args
) => Args extends []
    ? ValueAssertion<ChainedAs, Config>
    : NextAssertions<Config>) &
    ValueAssertion<ChainedAs, Config>

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
} & (Config["allowTypeAssertions"] extends true
    ? {
          returnsTypedValue: (expected: unknown) => undefined
          throwsWithTypeError: (message: string) => undefined
      }
    : {})

export type FunctionalValueAssertion<
    Args extends any[],
    Return,
    Config extends AssertionConfig
> = FunctionAssertionWithArgsIfNeeded<
    Args,
    CallableFunctionAssertion<Return, Config>
>

export type FunctionAssertionWithArgsIfNeeded<
    Args extends any[],
    AssertionsOnceCallable
> = ([] extends Args ? AssertionsOnceCallable : {}) &
    (Args extends []
        ? {}
        : {
              args: (...args: Args) => AssertionsOnceCallable
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

export const valueAssertions = <T, Config extends AssertionConfig>(
    position: SourcePosition,
    value: T,
    config: Config
): ValueAssertion<T, Config> => {
    const nextAssertions = config.allowTypeAssertions
        ? typeAssertions(position)
        : undefined
    if (typeof value === "function") {
        return {
            args: (...args: any[]) =>
                valueAssertions(position, () => value(...args), config),
            returns: (...args: any[]) => {
                const result = value()
                if (!args.length) {
                    return valueAssertions(position, result, config)
                }
                defaultAssert(value, args[0])
                return nextAssertions
            },
            throws: (...args: any[]) => {
                const message = getThrownMessage(value)
                if (!args.length) {
                    return valueAssertions(position, message, config)
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
        snap: withCallPosition(
            (position: SourcePosition, ...args: [expected?: string]) => {
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
