import {
    Func,
    isRecursible,
    IsAnyOrUnknown,
    ListPossibleTypes,
    ElementOf,
    toString
} from "@re-/tools"
import { SourcePosition } from "../positions.js"
import { AssertionConfig } from "../assert.js"
import { TypeAssertions, typeAssertions } from "../type/context.js"
import { getAssertionData } from "../type/ts.js"
import {
    updateInlineSnapshot,
    updateExternalSnapshot,
    getSnapshotByName
} from "./snapshot.js"
import { assertEquals, assertMatch } from "@deno/testing"

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
    ImmediateAssertions = ValueAssertion<ListPossibleTypes<Chained>, Config> &
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

export type ExternalSnapshotOptions = {
    path?: string
}

export type ComparableValueAssertion<
    PossibleValues extends any[],
    Config extends AssertionConfig
> = {
    is: (value: ElementOf<PossibleValues>) => NextAssertions<Config>
    snap: ((value?: string) => undefined) & {
        toFile: (name: string, options?: ExternalSnapshotOptions) => undefined
    }
    equals: (value: ElementOf<PossibleValues>) => NextAssertions<Config>
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

/**
 *  If we don't pass the possible values as a list, TS
 *  takes a union of the whole assertion object instead
 *  of a function that accepts one of a union type
 **/

export type ValueAssertion<
    PossibleValues extends any[],
    Config extends AssertionConfig,
    T = ElementOf<PossibleValues>
> = IsAnyOrUnknown<T> extends true
    ? FunctionalValueAssertion<T[], T, Config> &
          ComparableValueAssertion<PossibleValues, Config>
    : T extends Func<infer Args, infer Return>
    ? FunctionalValueAssertion<Args, Return, Config>
    : ComparableValueAssertion<PossibleValues, Config>

const defaultAssert = (value: unknown, expected: unknown, allowRegex = false) =>
    isRecursible(value)
        ? assertEquals(value, expected)
        : allowRegex && typeof value === "string" && expected instanceof RegExp
        ? assertMatch(value, expected)
        : assertEquals(value, expected)

export const getNextAssertions = (
    position: SourcePosition,
    config: AssertionConfig
) => (config.allowTypeAssertions ? typeAssertions(position, config) : undefined)

export const valueAssertions = <T, Config extends AssertionConfig>(
    position: SourcePosition,
    value: T,
    config: Config
): ValueAssertion<ListPossibleTypes<T>, Config> => {
    const nextAssertions = getNextAssertions(position, config)
    const serializedValue = toString(value)
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
                    const matcher =
                        matchValue instanceof RegExp
                            ? matchValue
                            : RegExp(matchValue)
                    assertMatch(getThrownMessage(value), matcher)
                    assertMatch(getAssertionData(position).errors, matcher)
                }
            }
        }
        return functionAssertions
    }
    const inlineSnap = (expected?: string) => {
        if (expected) {
            assertEquals(serializedValue, expected)
        } else {
            updateInlineSnapshot({
                value: serializedValue,
                position,
                project: config.project
            })
        }
    }

    const baseAssertions = {
        is: (expected: unknown) => {
            assertEquals(value, expected)
            return nextAssertions
        },
        snap: Object.assign(inlineSnap, {
            toFile: (name: string, options: ExternalSnapshotOptions = {}) => {
                const expectedSnapshot = getSnapshotByName(
                    position.file,
                    name,
                    options
                )
                if (expectedSnapshot) {
                    assertEquals(serializedValue, expectedSnapshot)
                } else {
                    updateExternalSnapshot({
                        value: serializedValue,
                        position,
                        name,
                        ...options
                    })
                }
            }
        }),
        equals: (expected: unknown) => {
            assertEquals(value, expected)
            return nextAssertions
        }
    } as any
    if (config["allowTypeAssertions"]) {
        return {
            ...baseAssertions,
            typedValue: (expectedValue) => {
                defaultAssert(value, expectedValue)
                const typeData = getAssertionData(position)
                if (!typeData.type.expected) {
                    throw new Error(
                        `Expected an 'as' expression after 'typed' prop access at position ${position.char} on` +
                            `line ${position.line} of ${position.file}.`
                    )
                }
                defaultAssert(typeData.type.actual, typeData.type.expected)
            }
        }
    }
    return baseAssertions
}
