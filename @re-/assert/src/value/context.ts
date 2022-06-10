import { strict } from "node:assert"
import { isDeepStrictEqual } from "node:util"
import { caller } from "@re-/node"
import {
    ElementOf,
    Func,
    IsAnyOrUnknown,
    ListPossibleTypes,
    toString
} from "@re-/tools"
import { AssertionContext } from "../assert.js"
import { SourcePosition } from "../common.js"
import {
    getAssertionData,
    TypeAssertions,
    typeAssertions
} from "../type/index.js"
import {
    getSnapshotByName,
    queueInlineSnapshotUpdate,
    SnapshotArgs,
    updateExternalSnapshot,
    writeInlineSnapshotToFile
} from "./snapshot.js"

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
    config: AssertionContext,
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
                        baseAssertions,
                        getNextAssertions(position, config)
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
                        baseAssertions,
                        getNextAssertions(position, config)
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
    snap: ((value?: unknown) => NextAssertions<AllowTypeAssertions>) & {
        toFile: (
            name: string,
            options?: ExternalSnapshotOptions
        ) => NextAssertions<AllowTypeAssertions>
    }
    equals: (
        value: ElementOf<PossibleValues>
    ) => NextAssertions<AllowTypeAssertions>
    value: {
        is: (value: unknown) => NextAssertions<AllowTypeAssertions>
        equals: (value: unknown) => NextAssertions<AllowTypeAssertions>
    }
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
        string,
        false
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
 */
export type ValueAssertion<
    PossibleValues extends any[],
    AllowTypeAssertions extends boolean,
    T = ElementOf<PossibleValues>
> = IsAnyOrUnknown<T> extends true
    ? FunctionalValueAssertion<T[], T, AllowTypeAssertions> &
          ComparableValueAssertion<PossibleValues, AllowTypeAssertions>
    : PossibleValues extends Func[]
    ? T extends Func<infer Args, infer Return>
        ? FunctionalValueAssertion<Args, Return, AllowTypeAssertions>
        : {}
    : ComparableValueAssertion<
          ListPossibleTypes<Exclude<T, Func>>,
          AllowTypeAssertions
      >

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
        strict.deepEqual(actual, expected)
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
) => (ctx.allowTypeAssertions ? typeAssertions(position, ctx) : {})

export const valueAssertions = <T>(
    position: SourcePosition,
    actual: T,
    ctx: AssertionContext
): ValueAssertion<ListPossibleTypes<T>, boolean, boolean> => {
    const nextAssertions = getNextAssertions(position, ctx)
    if (typeof actual === "function") {
        const functionAssertions = {
            args: (...args: any[]) =>
                valueAssertions(position, actual, {
                    ...ctx,
                    args
                }),
            returns: chainableAssertion(
                position,
                () => {
                    const result = runAssertionFunction(actual, ctx)
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
                () => getThrownMessage(runAssertionFunction(actual, ctx)),
                ctx,
                { allowRegex: true }
            )
        }
        if (ctx["allowTypeAssertions"]) {
            // @ts-ignore
            functionAssertions.throwsAndHasTypeError = (
                matchValue: string | RegExp
            ) => {
                defaultAssert(
                    getThrownMessage(runAssertionFunction(actual, ctx)),
                    matchValue,
                    true
                )
                defaultAssert(
                    getAssertionData(position).errors,
                    matchValue,
                    true
                )
            }
        }
        return functionAssertions
    }
    const serialize = (value: unknown) =>
        ctx.config.stringifySnapshots
            ? `${toString(value, { quotes: "double" })}`
            : toString(value, { quotes: "backtick" })
    const actualSerialized = serialize(actual)
    const inlineSnap = (expected?: unknown) => {
        if (!expected || ctx.config.updateSnapshots) {
            if (!isDeepStrictEqual(actualSerialized, serialize(expected))) {
                const snapshotArgs: SnapshotArgs = {
                    position: caller(),
                    serializedValue: actualSerialized
                }
                if (ctx.config.precached) {
                    queueInlineSnapshotUpdate(snapshotArgs)
                } else {
                    writeInlineSnapshotToFile(snapshotArgs)
                }
            }
        } else {
            strict.deepEqual(actualSerialized, serialize(expected))
        }
        return nextAssertions
    }
    const baseValueAssertions = {
        is: (expected: unknown) => {
            strict.equal(actual, expected)
            return nextAssertions
        },
        equals: (expected: unknown) => {
            strict.deepEqual(actual, expected)
            return nextAssertions
        }
    }
    const baseAssertions = {
        ...baseValueAssertions,
        value: baseValueAssertions,
        snap: Object.assign(inlineSnap, {
            toFile: (name: string, options: ExternalSnapshotOptions = {}) => {
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
                    strict.deepEqual(actualSerialized, expectedSnapshot)
                }
                return nextAssertions
            }
        })
    } as any
    if (ctx["allowTypeAssertions"]) {
        return {
            ...baseAssertions,
            typedValue: (expectedValue: unknown) => {
                defaultAssert(actual, expectedValue)
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
