import { strict } from "node:assert"
import { isDeepStrictEqual } from "node:util"
import { caller } from "@re-/node"
import { Fn, IsAnyOrUnknown, ListComparisonMode, toString } from "@re-/tools"
import { AssertionContext } from "../assert.js"
import { assertEquals, literalSerialize, SourcePosition } from "../common.js"
import { getAssertionData, TypeAssertions } from "../type/index.js"
import {
    getSnapshotByName,
    queueInlineSnapshotWriteOnProcessExit,
    SnapshotArgs,
    updateExternalSnapshot,
    writeInlineSnapshotUpdateToCacheDir
} from "./snapshot.js"

export type ChainableValueAssertion<
    ArgsType extends [value: any, ...rest: any[]],
    AllowTypeAssertions extends boolean,
    Chained = ArgsType[0],
    IsReturn extends boolean = false,
    ImmediateAssertions = ValueAssertion<Chained, AllowTypeAssertions> &
        (IsReturn extends true ? NextAssertions<AllowTypeAssertions> : {})
> = (<Args extends ArgsType | [] = []>(
    ...args: Args
) => NextAssertions<AllowTypeAssertions>) &
    ImmediateAssertions

export type ChainableAssertionOptions = {
    isReturn?: boolean
    allowRegex?: boolean
    defaultExpected?: unknown
}

export const chainableAssertion = (
    position: SourcePosition,
    valueThunk: () => unknown,
    config: AssertionContext,
    options: ChainableAssertionOptions = {}
) =>
    new Proxy(
        (...args: [expected: unknown]) => {
            let expected
            if (args.length) {
                expected = args[0]
            } else {
                if ("defaultExpected" in options) {
                    expected = options.defaultExpected
                } else {
                    throw new Error(
                        `Assertion requires an arg representing the expected value.`
                    )
                }
            }
            defaultAssert(valueThunk(), expected, options.allowRegex)
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
                if (options.isReturn) {
                    const nextAssertions = getNextAssertions(position, config)
                    if (prop in nextAssertions) {
                        return (nextAssertions as any)[prop]
                    }
                }
                return baseAssertions[prop]
            }
        }
    )

export type ExternalSnapshotOptions = {
    path?: string
}

export type EqualsOptions = {
    listComparison?: ListComparisonMode
}

export type ComparableValueAssertion<T, AllowTypeAssertions extends boolean> = {
    is: (value: T) => NextAssertions<AllowTypeAssertions>
    snap: ((value?: T) => NextAssertions<AllowTypeAssertions>) & {
        toFile: (
            name: string,
            options?: ExternalSnapshotOptions
        ) => NextAssertions<AllowTypeAssertions>
    }
    equals: (
        value: T,
        options?: EqualsOptions
    ) => NextAssertions<AllowTypeAssertions>
    value: Omit<ComparableValueAssertion<unknown, AllowTypeAssertions>, "value">
} & (AllowTypeAssertions extends true
    ? { typedValue: (expected: unknown) => undefined }
    : {})

export type CallableFunctionAssertions<
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
        string,
        false
    >
} & (AllowTypeAssertions extends true
    ? {
          throwsAndHasTypeError: (message: string | RegExp) => undefined
      }
    : {})

export type FunctionAssertions<
    Args extends any[],
    Return,
    AllowTypeAssertions extends boolean
> = ([] extends Args
    ? CallableFunctionAssertions<Return, AllowTypeAssertions>
    : {}) &
    (Args extends []
        ? {}
        : {
              args: (
                  ...args: Args
              ) => CallableFunctionAssertions<Return, AllowTypeAssertions>
          })

export type NextAssertions<AllowTypeAssertions extends boolean> =
    AllowTypeAssertions extends true ? TypeAssertions : {}

export type AnyOrUnknownValueAssertion<
    T,
    AllowTypeAssertions extends boolean
> = FunctionAssertions<T[], T, AllowTypeAssertions> &
    ComparableValueAssertion<T, AllowTypeAssertions>

export type TypedValueAssertions<T, AllowTypeAssertions extends boolean> = [
    T
] extends [Fn<infer Args, infer Return>]
    ? FunctionAssertions<Args, Return, AllowTypeAssertions>
    : ComparableValueAssertion<T, AllowTypeAssertions>

export type ValueAssertion<
    T,
    AllowTypeAssertions extends boolean
> = IsAnyOrUnknown<T> extends true
    ? AnyOrUnknownValueAssertion<T, AllowTypeAssertions>
    : TypedValueAssertions<T, AllowTypeAssertions>

const defaultAssert = (
    actual: unknown,
    expected: unknown,
    allowRegex = false
) => {
    if (allowRegex) {
        if (typeof actual !== "string") {
            throw new strict.AssertionError({
                message: `Value was of type ${typeof actual} (expected a string).`
            })
        }
        if (typeof expected === "string") {
            if (!actual.includes(expected)) {
                throw new strict.AssertionError({
                    message: `Expected string '${expected}' did not appear in actual string '${actual}'.`
                })
            }
        } else if (expected instanceof RegExp) {
            strict.match(actual, expected)
        } else {
            throw new strict.AssertionError({
                message: `Expected value for this assertion should be a string or RegExp.`,
                expected,
                actual
            })
        }
    } else {
        assertEquals(expected, actual)
    }
}

const getThrownMessage = (result: RunAssertionFunctionResult) => {
    if (!("threw" in result)) {
        throw new strict.AssertionError({
            message: "Function didn't throw."
        })
    }
    return result.threw
}

type RunAssertionFunctionResult = {
    returned?: unknown
    threw?: string
}

export const runAssertionFunction = (
    asserted: Function,
    ctx: AssertionContext
): RunAssertionFunctionResult => {
    const result: RunAssertionFunctionResult = {}
    try {
        result.returned = asserted(...ctx.args)
    } catch (error) {
        result.threw = String(error)
    }
    return result
}

export const getNextAssertions = (
    position: SourcePosition,
    ctx: AssertionContext
) => (ctx.allowTypeAssertions ? new TypeAssertions(position, ctx) : {})

export const valueAssertions = <T>(
    position: SourcePosition,
    actual: T,
    ctx: AssertionContext
): ValueAssertion<T, boolean> => {
    const nextAssertions = getNextAssertions(position, ctx)
    const serialize = (value: unknown) =>
        ctx.config.stringifySnapshots
            ? `${toString(value, { quote: "double" })}`
            : literalSerialize(value)

    const inlineSnap = (...args: [unknown]) => {
        const actualSerialized = serialize(actual)
        if (!args.length || ctx.config.updateSnapshots) {
            if (!isDeepStrictEqual(actualSerialized, serialize(args[0]))) {
                const snapshotArgs: SnapshotArgs = {
                    position: caller(),
                    serializedValue: actualSerialized
                }
                if (ctx.config.precached) {
                    writeInlineSnapshotUpdateToCacheDir(snapshotArgs)
                } else {
                    queueInlineSnapshotWriteOnProcessExit(snapshotArgs)
                }
            }
        } else {
            assertEquals(serialize(args[0]), actualSerialized)
        }
        return nextAssertions
    }
    let currentAssertions: any
    currentAssertions = {
        args: (...args: any[]) =>
            valueAssertions(position, actual, {
                ...ctx,
                args
            }),
        returns: chainableAssertion(
            position,
            () => {
                const result = runAssertionFunction(actual as Fn, ctx)
                if (!("returned" in result)) {
                    throw new strict.AssertionError({
                        message: result.threw
                    })
                }
                return result.returned
            },
            {
                ...ctx,
                returnsCount: ctx.returnsCount + 1
            },
            { isReturn: true }
        ),
        throws: chainableAssertion(
            position,
            () => getThrownMessage(runAssertionFunction(actual as Fn, ctx)),
            ctx,
            { allowRegex: true, defaultExpected: "" }
        ),
        throwsAndHasTypeError: (matchValue: string | RegExp) => {
            defaultAssert(
                getThrownMessage(runAssertionFunction(actual as Fn, ctx)),
                matchValue,
                true
            )
            if (!ctx.config.skipTypes) {
                defaultAssert(
                    getAssertionData(position).errors,
                    matchValue,
                    true
                )
            }
        },
        is: (expected: unknown) => {
            strict.equal(actual, expected)
            return nextAssertions
        },
        equals: (expected: unknown, options?: EqualsOptions) => {
            assertEquals(expected, actual, options)
            return nextAssertions
        },
        snap: Object.assign(inlineSnap, {
            toFile: (name: string, options: ExternalSnapshotOptions = {}) => {
                const actualSerialized = serialize(actual)
                const expectedSnapshot = getSnapshotByName(
                    position.file,
                    name,
                    options.path
                )
                if (!expectedSnapshot || ctx.config.updateSnapshots) {
                    if (
                        !isDeepStrictEqual(actualSerialized, expectedSnapshot)
                    ) {
                        updateExternalSnapshot({
                            serializedValue: actualSerialized,
                            position: caller(),
                            name,
                            customPath: options.path
                        })
                    }
                } else {
                    assertEquals(expectedSnapshot, actualSerialized)
                }
                return nextAssertions
            }
        }),
        typedValue: (expectedValue: unknown) => {
            defaultAssert(actual, expectedValue)
            if (!ctx.config.skipTypes) {
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
    currentAssertions.value = currentAssertions
    return currentAssertions
}
