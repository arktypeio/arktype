import { SourcePosition, withCallPosition } from "@re-do/node"
import { Func, isRecursible, NonRecursible, IsAnyOrUnknown } from "@re-do/utils"
import { AssertionConfig } from "../assert.js"
import { TypeAssertions, typeAssertions } from "../type/context.js"
import { errorsOfNextType, nextTypeToString } from "../type/types.js"

const getThrownMessage = (value: Function) => {
    try {
        value()
    } catch (e) {
        if (isRecursible(e) && "message" in e) {
            return String(e.message)
        }
        return String(e)
    }
    throw new Error(`${value.toString()} didn't throw.`)
}

export type ChainableValueAssertion<
    ArgsType extends [value: any, ...rest: any[]],
    Config extends AssertionConfig,
    Chained = ArgsType[0],
    IsReturn extends boolean = false,
    ImmediateAssertions = ValueAssertion<Chained, Config> &
        (IsReturn extends true ? NextAssertions<Config> : {})
> = (<Args extends ArgsType | [] = []>(
    ...args: Args
) => Args extends [] ? ImmediateAssertions : NextAssertions<Config>) &
    ImmediateAssertions

export type ChainableAssertionOptions = {
    isReturn?: boolean
    allowRegex?: boolean
}

export const chainableAssertion = (
    position: SourcePosition,
    valueThunk: () => unknown,
    config: AssertionConfig,
    { isReturn = false, allowRegex = false }: ChainableAssertionOptions = {}
) =>
    new Proxy(
        (...args: [expected: unknown]) => {
            if (!args.length) {
                const baseAssertions = valueAssertions(
                    position,
                    valueThunk(),
                    config
                )
                if (isReturn) {
                    return Object.assign(
                        getNextAssertions(position, config),
                        baseAssertions
                    )
                }
                return baseAssertions
            }
            defaultAssert(valueThunk(), args[0], allowRegex)
            return getNextAssertions(position, config)
        },
        {
            get: (target, prop) => {
                if (prop in target) {
                    return (target as any)[prop]
                }
                const baseAssertions: any = valueAssertions(
                    position,
                    valueThunk(),
                    config
                )
                if (isReturn) {
                    return Object.assign(
                        getNextAssertions(position, config),
                        baseAssertions
                    )[prop]
                }
                return baseAssertions[prop]
            }
        }
    )

export type ComparableValueAssertion<T, Config extends AssertionConfig> = {
    is: (value: T) => NextAssertions<Config>
    snap: ((value?: string) => undefined) & { toFile: () => undefined }
    equals: (value: T) => NextAssertions<Config>
} & (Config["allowTypeAssertions"] extends true
    ? { typedValue: (expected: unknown) => undefined }
    : {})

export type CallableFunctionAssertion<
    Return,
    Config extends AssertionConfig
> = {
    returns: ChainableValueAssertion<[value: Return], Config, Return, true>
    throws: ChainableValueAssertion<[message: string | RegExp], Config, string>
} & (Config["allowTypeAssertions"] extends true
    ? {
          throwsAndHasTypeError: (message: string | RegExp) => undefined
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
    Config["allowTypeAssertions"] extends true ? TypeAssertions : {}

export type ValueAssertion<
    T,
    Config extends AssertionConfig
> = IsAnyOrUnknown<T> extends true
    ? FunctionalValueAssertion<T[], T, Config> &
          ComparableValueAssertion<T, Config>
    : T extends Func<infer Args, infer Return>
    ? FunctionalValueAssertion<Args, Return, Config>
    : ComparableValueAssertion<T, Config>

const defaultAssert = (
    value: unknown,
    expected: unknown,
    allowRegex: boolean = false
) =>
    isRecursible(value)
        ? expect(value).toStrictEqual(expected)
        : allowRegex &&
          (typeof expected === "string" || expected instanceof RegExp)
        ? expect(value).toMatch(expected)
        : expect(value).toBe(expected)

export const getNextAssertions = (
    position: SourcePosition,
    config: AssertionConfig
) => (config.allowTypeAssertions ? typeAssertions(position, config) : undefined)

export const valueAssertions = <T, Config extends AssertionConfig>(
    position: SourcePosition,
    value: T,
    config: Config
): ValueAssertion<T, Config> => {
    const nextAssertions = getNextAssertions(position, config)
    if (typeof value === "function") {
        const functionAssertions = {
            args: (...args: any[]) =>
                valueAssertions(position, () => value(...args), config),
            returns: chainableAssertion(
                position,
                () => value(),
                {
                    ...config,
                    returnsCount: config.returnsCount + 1
                },
                { isReturn: true }
            ),
            throws: chainableAssertion(
                position,
                () => getThrownMessage(value),
                config,
                { allowRegex: true }
            )
        } as any
        if (config["allowTypeAssertions"]) {
            return {
                ...functionAssertions,
                throwsAndHasTypeError: (matchValue: string | RegExp) => {
                    expect(getThrownMessage(value)).toMatch(matchValue)
                    expect(errorsOfNextType(position)).toMatch(matchValue)
                }
            }
        }
        return functionAssertions
    }
    const baseAssertions = {
        is: (expected: unknown) => {
            expect(value).toBe(expected)
            return nextAssertions
        },
        // TODO: Decouple snap from jest so it can be chained
        snap: Object.assign(expect(value).toMatchInlineSnapshot, {
            toFile: expect(value).toMatchSnapshot
        }) as any,
        equals: (expected: unknown) => {
            expect(value).toStrictEqual(expected)
            return nextAssertions
        }
    } as any
    if (config["allowTypeAssertions"]) {
        return {
            ...baseAssertions,
            typedValue: withCallPosition(
                (expectedPosition, expectedValue) => {
                    defaultAssert(value, expectedValue)
                    expect(
                        nextTypeToString(position, {
                            returnsCount: config.returnsCount
                        })
                    ).toBe(nextTypeToString(expectedPosition))
                },
                { formatPath: { seperator: "/" } }
            )
        }
    }
    return baseAssertions
}
