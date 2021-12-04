import { SourcePosition, withCallPosition } from "@re-do/node"
import { Func, isRecursible, NonRecursible } from "@re-do/utils"
import { AssertionConfig } from "../assert.js"
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

export const chainableAssertion = (
    position: SourcePosition,
    valueThunk: () => unknown,
    config: AssertionConfig
) =>
    new Proxy(
        (...args: [expected: unknown]) => {
            if (!args.length) {
                return valueAssertions(position, valueThunk(), config)
            }
            defaultAssert(valueThunk(), args[0])
            return getNextAssertions(position, config)
        },
        {
            get: (target, prop) => {
                if (prop in target) {
                    return (target as any)[prop]
                }
                const assertions: any = valueAssertions(
                    position,
                    valueThunk(),
                    config
                )
                return assertions[prop]
            }
        }
    )

export type ComparableValueAssertion<T, Config extends AssertionConfig> = {
    is: (value: T) => NextAssertions<Config>
    snap: (value?: string) => NextAssertions<Config>
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
    : ComparableValueAssertion<T, Config>

const defaultAssert = (value: unknown, expected: unknown) =>
    isRecursible(value)
        ? expect(value).toStrictEqual(expected)
        : expect(value).toBe(expected)

export const getNextAssertions = (
    position: SourcePosition,
    config: AssertionConfig
) => (config.allowTypeAssertions ? typeAssertions(position) : undefined)

export const valueAssertions = <T, Config extends AssertionConfig>(
    position: SourcePosition,
    value: T,
    config: Config
): ValueAssertion<T, Config> => {
    const nextAssertions = getNextAssertions(position, config)
    if (typeof value === "function") {
        return {
            args: (...args: any[]) =>
                valueAssertions(position, () => value(...args), config),
            returns: chainableAssertion(position, () => value(), config),
            throws: chainableAssertion(
                position,
                () => getThrownMessage(value),
                config
            )
        } as any
    }
    const baseAssertions: ComparableValueAssertion<T, any> = {
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
        ),
        equals: (expected: unknown) => {
            expect(value).toStrictEqual(expected)
            return nextAssertions
        }
    }
    return baseAssertions as any
}
