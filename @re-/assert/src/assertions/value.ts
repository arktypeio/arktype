/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
import { strict } from "node:assert"
import { isDeepStrictEqual } from "node:util"
import { caller } from "@re-/node"
import { Fn, IsAnyOrUnknown, ListComparisonMode, toString } from "@re-/tools"
import { AssertionContext } from "../assert.js"
import { assertEquals, literalSerialize, SourcePosition } from "../common.js"
import {
    getSnapshotByName,
    queueInlineSnapshotWriteOnProcessExit,
    SnapshotArgs,
    updateExternalSnapshot,
    writeInlineSnapshotUpdateToCacheDir
} from "../snapshot.js"
import { getAssertionAtPos, TypeAssertions } from "../type/index.js"
import { defaultAssert } from "./defaultAssert.js"

export type ChainableAssertionOptions = {
    isReturn?: boolean
    allowRegex?: boolean
    defaultExpected?: unknown
}

export type ExternalSnapshotOptions = {
    path?: string
}

export type EqualsOptions = {
    listComparison?: ListComparisonMode
}

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

export type NextAssertions<AllowTypeAssertions extends boolean> =
    AllowTypeAssertions extends true ? TypeAssertions : {}

export class Assertions<T> {
    actual: T
    actualSerialized: any

    constructor(private ctx: AssertionContext) {
        this.actual = ctx.actualValueThunk() as any
        this.actualSerialized = this.serialize(this.actual)
    }

    private serialize(value: unknown) {
        return this.ctx.cfg.stringifySnapshots
            ? `${toString(value, { quote: "double" })}`
            : literalSerialize(value)
    }

    snap(...args: [expected: unknown]) {
        const expectedSerialized = this.serialize(args[0])
        if (!args.length || this.ctx.cfg.updateSnapshots) {
            if (
                !isDeepStrictEqual(this.actualSerialized, expectedSerialized) ||
                // If actual is undefined, we still need to write the "undefined" literal
                // to the snap even though it will serialize to the same value as the (nonexistent) first arg
                this.actual === undefined
            ) {
                const snapshotArgs: SnapshotArgs = {
                    position: caller(),
                    serializedValue: this.actualSerialized
                }
                if (this.ctx.cfg.precached) {
                    writeInlineSnapshotUpdateToCacheDir(snapshotArgs)
                } else {
                    queueInlineSnapshotWriteOnProcessExit(snapshotArgs)
                }
            }
        } else {
            assertEquals(expectedSerialized, this.actualSerialized)
        }
        return new TypeAssertions(this.ctx)
    }

    args(...args: any[]) {
        return new Assertions({
            ...this.ctx,
            assertedFnArgs: args
        })
    }
    returns() {
        return new Assertions({
            ...this.ctx,
            isReturn: true,
            actualValueThunk: () => {
                const result = callAssertedFunction(this.actual as Fn, ctx)
                if (!("returned" in result)) {
                    throw new strict.AssertionError({
                        message: result.threw
                    })
                }
                return result.returned
            }
        })
    }

    throws() {
        return new Assertions({
            ...this.ctx,
            allowRegex: true,
            defaultExpected: "",
            actualValueThunk: () =>
                getThrownMessage(callAssertedFunction(actual as Fn, ctx))
        })
    }

    throwsAndHasTypeError(matchValue: string | RegExp) {
        defaultAssert(
            getThrownMessage(callAssertedFunction(actual as Fn, ctx)),
            matchValue,
            true
        )
        if (!this.ctx.cfg.skipTypes) {
            defaultAssert(
                getAssertionAtPos(this.ctx.position).errors,
                matchValue,
                true
            )
        }
    }
    is(expected: unknown) {
        strict.equal(this.actual, expected)
        return new TypeAssertions(this.ctx)
    }
    equals(expected: unknown, options?: EqualsOptions) {
        assertEquals(expected, this.actual, options)
        return new TypeAssertions(this.ctx)
    }

    toFile(name: string, options: ExternalSnapshotOptions = {}) {
        const actualSerialized = serialize(actual)
        const expectedSnapshot = getSnapshotByName(
            position.file,
            name,
            options.path
        )
        if (!expectedSnapshot || ctx.cfg.updateSnapshots) {
            if (
                !isDeepStrictEqual(actualSerialized, expectedSnapshot) ||
                actual === undefined
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
        return new TypeAssertions(this.ctx)
    }

    typedValue(expectedValue: unknown) {
        defaultAssert(this.actual, expectedValue)
        if (!this.ctx.cfg.skipTypes) {
            const typeData = getAssertionAtPos(this.ctx.position)
            if (!typeData.type.expected) {
                throw new Error(
                    `Unable to infer type at position ${this.ctx.position.char} on` +
                        `line ${this.ctx.position.line} of ${this.ctx.position.file}.`
                )
            }
            defaultAssert(typeData.type.actual, typeData.type.expected)
        }
    }

    get type(): TypeAssertionProps {
        if (this.ctx.cfg.skipTypes) {
            return chainableNoOpProxy
        }
        return {
            toString: createChainableAssertFn({
                ...this.ctx,
                actualValueThunk: () =>
                    getAssertionAtPos(this.ctx.position).type.actual,
                allowTypeAssertions: false
            }),
            errors: createChainableAssertFn({
                ...this.ctx,
                actualValueThunk: () =>
                    getAssertionAtPos(this.ctx.position).errors,
                allowRegex: true,
                allowTypeAssertions: false
            })
        } as TypeAssertionProps
    }

    get typed(): unknown {
        if (this.ctx.cfg.skipTypes) {
            return chainableNoOpProxy
        }
        const assertionData = getAssertionAtPos(this.ctx.position)
        if (!assertionData.type.expected) {
            throw new Error(
                `Expected an 'as' expression after 'typed' prop access at position ${this.ctx.position.char} on ` +
                    `line ${this.ctx.position.line} of ${this.ctx.position.file}.`
            )
        }
        if (
            !assertionData.type.equivalent &&
            assertionData.type.actual !== assertionData.type.expected
        ) {
            strict.equal(assertionData.type.actual, assertionData.type.expected)
        }
        return undefined
    }
}
