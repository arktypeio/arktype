import { caller } from "@arktype/fs"
import { printable, snapshot, type Constructor } from "@arktype/util"
import * as assert from "node:assert/strict"
import { isDeepStrictEqual } from "node:util"
import {
	getSnapshotByName,
	queueSnapshotUpdate,
	updateExternalSnapshot,
	type SnapshotArgs
} from "../cache/snapshots.js"
import type { Completions } from "../cache/writeAssertionCache.js"
import { chainableNoOpProxy } from "../utils.js"
import {
	TypeAssertionMapping,
	assertEqualOrMatching,
	assertEquals,
	callAssertedFunction,
	getThrownMessage,
	throwAssertionError
} from "./assertions.js"
import type { AssertionContext } from "./attest.js"

export type ChainableAssertionOptions = {
	allowRegex?: boolean
	defaultExpected?: unknown
}

type AssertionRecord = Record<keyof rootAssertions<any, AssertionKind>, unknown>

export class ChainableAssertions implements AssertionRecord {
	constructor(private ctx: AssertionContext) {}

	private serialize(value: unknown) {
		return snapshot(value)
	}

	private get unversionedActual() {
		if (this.ctx.actual instanceof TypeAssertionMapping) {
			return this.ctx.actual.fn(
				this.ctx.typeRelationshipAssertionEntries![0][1],
				this.ctx
			)!.actual
		}
		return this.ctx.actual
	}

	private get serializedActual() {
		return this.serialize(this.unversionedActual)
	}

	private snapRequiresUpdate(expectedSerialized: unknown) {
		return (
			!isDeepStrictEqual(this.serializedActual, expectedSerialized) ||
			// If actual is undefined, we still need to write the "undefined" literal
			// to the snap even though it will serialize to the same value as the (nonexistent) first arg
			this.unversionedActual === undefined
		)
	}

	get unknown(): this {
		return this
	}

	is(expected: unknown): this {
		assert.equal(this.unversionedActual, expected)
		return this
	}

	equals(expected: unknown): this {
		assertEquals(expected, this.ctx.actual, this.ctx)
		return this
	}

	instanceOf(expected: Constructor): this {
		if (!(this.ctx.actual instanceof expected)) {
			throwAssertionError({
				ctx: this.ctx,
				message: `Expected an instance of ${expected.name} (was ${
					typeof this.ctx.actual === "object" && this.ctx.actual !== null ?
						this.ctx.actual.constructor.name
					:	this.serializedActual
				})`
			})
		}
		return this
	}

	get snap(): snapProperty<unknown, AssertionKind> {
		// Use variadic args to distinguish undefined being passed explicitly from no args
		const inline = (...args: unknown[]) => {
			const snapName = this.ctx.lastSnapName ?? "snap"
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
				if (printable(args[0]) !== printable(this.unversionedActual))
					assertEquals(expectedSerialized, this.serializedActual, this.ctx)
			}
			return this
		}
		const toFile = (id: string, opts?: ExternalSnapshotOptions) => {
			const expectedSnapshot = getSnapshotByName(
				this.ctx.position.file,
				id,
				opts?.path
			)
			if (!expectedSnapshot || this.ctx.cfg.updateSnapshots) {
				if (this.snapRequiresUpdate(expectedSnapshot)) {
					updateExternalSnapshot({
						serializedValue: this.serializedActual,
						position: caller(),
						name: id,
						customPath: opts?.path
					})
				}
			} else assertEquals(expectedSnapshot, this.serializedActual, this.ctx)

			return this
		}
		return Object.assign(inline, { toFile })
	}

	private immediateOrChained() {
		const immediateAssertion = (...args: [expected: unknown]) => {
			let expected
			if (args.length) expected = args[0]
			else {
				if ("defaultExpected" in this.ctx) expected = this.ctx.defaultExpected
				else {
					throw new Error(
						`Assertion call requires an arg representing the expected value.`
					)
				}
			}
			if (this.ctx.allowRegex)
				assertEqualOrMatching(expected, this.ctx.actual, this.ctx)
			else assertEquals(expected, this.ctx.actual, this.ctx)

			return this
		}
		return new Proxy(immediateAssertion, {
			get: (target, prop) => (this as any)[prop]
		})
	}

	get throws(): unknown {
		const result = callAssertedFunction(this.unversionedActual as Function)
		this.ctx.actual = getThrownMessage(result, this.ctx)
		this.ctx.allowRegex = true
		this.ctx.defaultExpected = ""
		return this.immediateOrChained()
	}

	throwsAndHasTypeError(matchValue: string | RegExp): void {
		assertEqualOrMatching(
			matchValue,
			getThrownMessage(
				callAssertedFunction(this.unversionedActual as Function),
				this.ctx
			),
			this.ctx
		)
		if (!this.ctx.cfg.skipTypes) {
			assertEqualOrMatching(
				matchValue,
				new TypeAssertionMapping(data => ({
					actual: data.errors.join("\n")
				})),
				this.ctx
			)
		}
	}

	get completions(): any {
		if (this.ctx.cfg.skipTypes) return chainableNoOpProxy

		this.ctx.actual = new TypeAssertionMapping(data => {
			checkCompletionsForErrors(data.completions)
			return { actual: data.completions }
		})
		this.ctx.lastSnapName = "completions"
		return this.snap
	}

	get type(): any {
		if (this.ctx.cfg.skipTypes) return chainableNoOpProxy

		// We need to bind this to return an object with getters
		const self = this
		return {
			get toString() {
				self.ctx.actual = new TypeAssertionMapping(data => ({
					actual: data.args[0].type
				}))
				return self.immediateOrChained()
			},
			get errors() {
				self.ctx.actual = new TypeAssertionMapping(data => ({
					actual: data.errors.join("\n")
				}))
				self.ctx.allowRegex = true
				return self.immediateOrChained()
			},
			get completions() {
				return self.completions
			}
		}
	}
}
const checkCompletionsForErrors = (completions?: Completions) => {
	if (typeof completions === "string") throw new Error(completions)
}

export type AssertionKind = "value" | "type"

export type rootAssertions<t, kind extends AssertionKind> = valueAssertions<
	t,
	kind
> &
	TypeAssertionsRoot

export type valueAssertions<
	t,
	kind extends AssertionKind
> = comparableValueAssertion<t, kind> &
	(t extends () => unknown ? functionAssertions<kind> : {})

export type nextAssertions<kind extends AssertionKind> =
	"type" extends kind ? TypeAssertionsRoot : {}

export type inferredAssertions<
	argsType extends [value: any, ...rest: any[]],
	kind extends AssertionKind,
	chained = argsType[0]
> = rootAssertions<chained, kind> &
	(<Args extends argsType | [] = []>(...args: Args) => nextAssertions<kind>)

export type ChainContext = {
	allowRegex?: boolean
	defaultExpected?: unknown
}

export type functionAssertions<kind extends AssertionKind> = {
	throws: inferredAssertions<[message: string | RegExp], kind, string>
} & ("type" extends kind ?
	{
		throwsAndHasTypeError: (message: string | RegExp) => undefined
	}
:	{})

export type valueFromTypeAssertion<
	expected,
	chained = expected
> = inferredAssertions<[expected: expected], "value", chained>

type snapProperty<expected, kind extends AssertionKind> = {
	(expected?: snapshot<expected>): nextAssertions<kind>
	toFile: (
		id: string,
		options?: ExternalSnapshotOptions
	) => nextAssertions<kind>
}

export type comparableValueAssertion<expected, kind extends AssertionKind> = {
	snap: snapProperty<expected, kind>
	equals: (value: expected) => nextAssertions<kind>
	instanceOf: (constructor: Constructor) => nextAssertions<kind>
	is: (value: expected) => nextAssertions<kind>
	completions: (value?: Completions) => void
	// This can be used to assert values without type constraints
	unknown: Omit<comparableValueAssertion<unknown, kind>, "unknown">
}

export type TypeAssertionsRoot = {
	type: TypeAssertionProps
}

export type TypeAssertionProps = {
	toString: valueFromTypeAssertion<string>
	errors: valueFromTypeAssertion<string | RegExp, string>
	completions: (value?: Completions) => void
}

export type ExternalSnapshotOptions = {
	path?: string
}
