import {
    Func,
    isRecursible,
    IsAnyOrUnknown,
    ListPossibleTypes,
    ElementOf,
    toString
} from "@re-/tools"
import { SourcePosition } from "src/common.ts"
import { AssertionConfig } from "src/assert.ts"
import { TypeAssertions, typeAssertions } from "src/type/context.ts"
import { getAssertionData } from "src/type/ts.ts"
import {
    updateInlineSnapshot,
    updateExternalSnapshot,
    getSnapshotByName
} from "src/value/snapshot.ts"
import { assertEquals, assertMatch } from "deno/std/testing/asserts.ts"

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
    AllowTypeAssertions extends boolean,
    Chained = ArgsType[0],
    IsReturn extends boolean = false,
    ImmediateAssertions = ValueAssertion<
        ListPossibleTypes<Chained>,
        AllowTypeAssertions
    > &
        (IsReturn extends true ? NextAssertions<AllowTypeAssertions> : {})
> = (<Args extends ArgsType | [] = []>(
    ...args: Args
) => Args extends []
    ? ImmediateAssertions
    : NextAssertions<AllowTypeAssertions>) &
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
    AllowTypeAssertions extends boolean
> = {
    is: (
        value: ElementOf<PossibleValues>
    ) => NextAssertions<AllowTypeAssertions>
    snap: ((value?: string) => undefined) & {
        toFile: (name: string, options?: ExternalSnapshotOptions) => undefined
    }
    equals: (
        value: ElementOf<PossibleValues>
    ) => NextAssertions<AllowTypeAssertions>
} & (AllowTypeAssertions extends true
    ? { typedValue: (expected: unknown) => undefined }
    : {})

export type CallableFunctionAssertion<
    Return,
    AllowTypeAssertions extends boolean
> = {
    returns: ChainableValueAssertion<
        [value: Return],
        AllowTypeAssertions,
        Return,
        true
    >
    throws: ChainableValueAssertion<
        [message: string | RegExp],
        AllowTypeAssertions,
        string
    >
} & (AllowTypeAssertions extends true
    ? {
          throwsAndHasTypeError: (message: string | RegExp) => undefined
      }
    : {})

export type FunctionalValueAssertion<
    Args extends any[],
    Return,
    AllowTypeAssertions extends boolean
> = FunctionAssertionWithArgsIfNeeded<
    Args,
    CallableFunctionAssertion<Return, AllowTypeAssertions>
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

export type NextAssertions<AllowTypeAssertions extends boolean> =
    AllowTypeAssertions extends true ? TypeAssertions : {}

/**
 *  If we don't pass the possible values as a list, TS
 *  takes a union of the whole assertion object instead
 *  of a function that accepts one of a union type
 **/

export type ValueAssertion<
    PossibleValues extends any[],
    AllowTypeAssertions extends boolean,
    T = ElementOf<PossibleValues>
> = IsAnyOrUnknown<T> extends true
    ? FunctionalValueAssertion<T[], T, AllowTypeAssertions> &
          ComparableValueAssertion<PossibleValues, AllowTypeAssertions>
    : T extends Func<infer Args, infer Return>
    ? FunctionalValueAssertion<Args, Return, AllowTypeAssertions>
    : ComparableValueAssertion<PossibleValues, AllowTypeAssertions>

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
): ValueAssertion<ListPossibleTypes<T>, Config["allowTypeAssertions"]> => {
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
                    options.path
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
