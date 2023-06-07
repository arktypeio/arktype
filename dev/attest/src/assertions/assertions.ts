import * as assert from "node:assert/strict"
import { isDeepStrictEqual } from "node:util"

import { snapshot, stringify } from "../../../../src/utils/serialize.js"
import { assertEquals } from "../assertions.js"
import type { AssertionContext } from "../attest.js"
import { caller } from "../main.js"
import type { SnapshotArgs } from "../snapshot.js"
import { getSnapshotByName, queueSnapshotUpdate } from "../snapshot.js"
import { getTypeDataAtPos } from "../type/getAssertionAtPos.js"
import { chainableNoOpProxy } from "../utils.js"
import { updateExternalSnapshot } from "../writeSnapshot.js"
import type { ExternalSnapshotArgs, rootAssertions } from "./types.js"
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

type AssertionRecord = Record<keyof rootAssertions<any, true>, unknown>

export class Assertions implements AssertionRecord {
    constructor(private ctx: AssertionContext) {}

    private serialize(value: unknown) {
        return snapshot(value)
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
        assert.equal(this.actual, expected)
        return this
    }
    equals(expected: unknown) {
        assertEquals(expected, this.actual, this.ctx)
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

    // Use variadic args to distinguish undefined being passed explicitly from no args
    snap(...args: [expected: unknown]) {
        const snapName = (args.at(1) ?? "snap") as string
        const expectedSerialized = this.serialize(args[0])
        if (!args.length || this.ctx.cfg.updateSnapshots) {
            if (this.snapRequiresUpdate(expectedSerialized)) {
                const snapshotArgs: SnapshotArgs = {
                    position: caller(),
                    serializedValue: this.serializedActual,
                    snapFunctionName: snapName
                }
                queueSnapshotUpdate(snapshotArgs)
            }
        } else {
            // compare as strings, but if match fails, compare again as objects
            // to give a clearer error message. This avoid problems with objects
            // like subtypes of array that do not pass node's deep equality test
            // but serialize to the same value.
            if (stringify(args[0]) !== stringify(this.actual)) {
                assertEquals(
                    expectedSerialized,
                    this.serializedActual,
                    this.ctx
                )
            }
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
                    position: caller(),
                    name: args.id,
                    customPath: args.path
                })
            }
        } else {
            assertEquals(expectedSnapshot, this.serializedActual, this.ctx)
        }
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
                assertEqualOrMatching(expected, this.actual, this.ctx)
            } else {
                assertEquals(expected, this.actual, this.ctx)
            }
            return this
        }
        return new Proxy(immediateAssertion, {
            get: (target, prop) => (this as any)[prop]
        })
    }

    get throws() {
        const result = callAssertedFunction(this.actual as Function)
        this.ctx.actual = getThrownMessage(result, this.ctx)
        this.ctx.allowRegex = true
        this.ctx.defaultExpected = ""
        return this.immediateOrChained()
    }

    throwsAndHasTypeError(matchValue: string | RegExp) {
        assertEqualOrMatching(
            matchValue,
            getThrownMessage(
                callAssertedFunction(this.actual as Function),
                this.ctx
            ),
            this.ctx
        )
        if (!this.ctx.cfg.skipTypes) {
            assertEqualOrMatching(
                matchValue,
                getTypeDataAtPos(this.ctx.position).errors,
                this.ctx
            )
        }
    }

    get types() {
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
            return undefined
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
            assert.equal(assertionData.type.actual, assertionData.type.expected)
        }
        return undefined
    }
}
