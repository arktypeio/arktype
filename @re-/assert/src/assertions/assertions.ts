import { strict } from "node:assert"
import { isDeepStrictEqual } from "node:util"
import { caller } from "@re-/node"
import { chainableNoOpProxy, Fn } from "@re-/tools"
import { AssertionContext } from "../assert.js"
import { assertEquals } from "../assertEquals.js"
import { literalSerialize } from "../common.js"
import {
    getSnapshotByName,
    queueInlineSnapshotWriteOnProcessExit,
    SnapshotArgs
} from "../snapshot.js"
import { getTypeDataAtPos } from "../type/index.js"
import {
    updateExternalSnapshot,
    writeInlineSnapshotUpdateToCacheDir
} from "../writeSnapshot.js"
import {
    AnyValueAssertion,
    EqualsOptions,
    ExternalSnapshotArgs
} from "./types.js"
import {
    assertEqualOrMatching,
    callAssertedFunction,
    getThrownMessage
} from "./utils.js"

export type ChainableAssertionOptions = {
    isReturn?: boolean
    allowRegex?: boolean
    defaultExpected?: unknown
}

type AnyAssertions = AnyValueAssertion<any, true>

type AssertionRecord = { [K in keyof AnyAssertions]: any }

export class Assertions implements AssertionRecord {
    constructor(private ctx: AssertionContext) {}

    private serialize(value: unknown) {
        return literalSerialize(value)
    }

    private get actual() {
        return this.ctx.actual
    }

    private get serializedActual() {
        return this.serialize(this.actual)
    }

    private snapRequiresUpdate(expectedSerialized: unknown) {
        return (
            !isDeepStrictEqual(this.serializedActual, expectedSerialized) ||
            // If actual is undefined, we still need to write the "undefined" literal
            // to the snap even though it will serialize to the same value as the (nonexistent) first arg
            this.actual === undefined
        )
    }

    get unknown() {
        return this
    }

    is(expected: unknown) {
        strict.equal(this.actual, expected)
        return this
    }
    equals(expected: unknown, options?: EqualsOptions) {
        assertEquals(expected, this.actual, { ...this.ctx, options })
        return this
    }

    typedValue(expectedValue: unknown) {
        assertEquals(expectedValue, this.actual, this.ctx)
        if (!this.ctx.cfg.skipTypes) {
            const typeData = getTypeDataAtPos(this.ctx.position)
            if (!typeData.type.expected) {
                throw new Error(
                    `Unable to infer type at position ${this.ctx.position.char} on` +
                        ` line ${this.ctx.position.line} of ${this.ctx.position.file}.`
                )
            }
            assertEquals(typeData.type.expected, typeData.type.actual, this.ctx)
        }
    }

    narrowedValue(expectedValue: unknown) {
        return this.typedValue(expectedValue)
    }

    snap(...args: [expected: unknown]) {
        const expectedSerialized = this.serialize(args[0])
        if (!args.length || this.ctx.cfg.updateSnapshots) {
            if (this.snapRequiresUpdate(expectedSerialized)) {
                const snapshotArgs: SnapshotArgs = {
                    position: caller(),
                    serializedValue: this.serializedActual,
                    value: this.actual,
                    benchFormat: this.ctx.cfg.benchFormat
                }
                if (this.ctx.cfg.precached) {
                    writeInlineSnapshotUpdateToCacheDir(snapshotArgs)
                } else {
                    queueInlineSnapshotWriteOnProcessExit(snapshotArgs)
                }
            }
        } else {
            assertEquals(expectedSerialized, this.serializedActual, this.ctx)
        }
        return this
    }

    snapToFile(args: ExternalSnapshotArgs) {
        const expectedSnapshot = getSnapshotByName(
            this.ctx.position.file,
            args.id,
            args.path
        )
        if (!expectedSnapshot || this.ctx.cfg.updateSnapshots) {
            if (this.snapRequiresUpdate(expectedSnapshot)) {
                updateExternalSnapshot({
                    serializedValue: this.serializedActual,
                    value: this.actual,
                    position: caller(),
                    name: args.id,
                    customPath: args.path,
                    benchFormat: this.ctx.cfg.benchFormat
                })
            }
        } else {
            assertEquals(expectedSnapshot, this.serializedActual, this.ctx)
        }
        return this
    }

    args(...args: any[]) {
        this.ctx.assertedFnArgs = args
        return this
    }

    private immediateOrChained() {
        const immediateAssertion = (...args: [expected: unknown]) => {
            let expected
            if (args.length) {
                expected = args[0]
            } else {
                if ("defaultExpected" in this.ctx) {
                    expected = this.ctx.defaultExpected
                } else {
                    throw new Error(
                        `Assertion call requires an arg representing the expected value.`
                    )
                }
            }
            if (this.ctx.allowRegex) {
                assertEqualOrMatching(expected, this.actual)
            } else {
                assertEquals(expected, this.actual, this.ctx)
            }
            return this
        }
        return new Proxy(immediateAssertion, {
            get: (target, prop) => (this as any)[prop]
        })
    }

    get returns() {
        const result = callAssertedFunction(this.actual as Fn, this.ctx)
        if (!("returned" in result)) {
            throw new strict.AssertionError({
                message: result.threw
            })
        }
        this.ctx.actual = result.returned
        this.ctx.isReturn = true
        return this.immediateOrChained()
    }

    get throws() {
        const result = callAssertedFunction(this.actual as Fn, this.ctx)
        this.ctx.actual = getThrownMessage(result)
        this.ctx.allowRegex = true
        this.ctx.defaultExpected = ""
        return this.immediateOrChained()
    }

    throwsAndHasTypeError(matchValue: string | RegExp) {
        assertEqualOrMatching(
            matchValue,
            getThrownMessage(callAssertedFunction(this.actual as Fn, this.ctx))
        )
        if (!this.ctx.cfg.skipTypes) {
            assertEqualOrMatching(
                matchValue,
                getTypeDataAtPos(this.ctx.position).errors
            )
        }
    }

    get type() {
        if (this.ctx.cfg.skipTypes) {
            return chainableNoOpProxy
        }
        // We need to bind this to return an object with getters
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this
        return {
            get toString() {
                self.ctx.actual = getTypeDataAtPos(
                    self.ctx.position
                ).type.actual
                return self.immediateOrChained()
            },
            get errors() {
                self.ctx.actual = getTypeDataAtPos(self.ctx.position).errors
                self.ctx.allowRegex = true
                return self.immediateOrChained()
            }
        }
    }

    get typed() {
        if (this.ctx.cfg.skipTypes) {
            return
        }
        const assertionData = getTypeDataAtPos(this.ctx.position)
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
    }
}
