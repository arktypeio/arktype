import { caller, positionToString } from "@ark/fs"
import {
	printable,
	snapshot,
	type Constructor,
	type ErrorType,
	type isDisjoint
} from "@ark/util"
import prettier from "@prettier/sync"
import { type } from "arktype"
import * as assert from "node:assert/strict"
import { isDeepStrictEqual } from "node:util"
import {
	getSnapshotByName,
	queueSnapshotUpdate,
	updateExternalSnapshot,
	type SnapshotArgs
} from "../cache/snapshots.ts"
import type { Completions } from "../cache/writeAssertionCache.ts"
import { getConfig } from "../config.ts"
import { chainableNoOpProxy } from "../utils.ts"
import {
	MissingSnapshotError,
	TypeAssertionMapping,
	assertEqualOrMatching,
	assertEquals,
	assertSatisfies,
	callAssertedFunction,
	getThrownMessage,
	throwAssertionError
} from "./assertions.ts"
import type { AssertionContext, VersionableActual } from "./attest.ts"

export type ChainableAssertionOptions = {
	allowRegex?: boolean
	defaultExpected?: unknown
}

type AssertionRecord = Record<keyof rootAssertions<any, AssertionKind>, unknown>

export type UnwrapOptions = {
	versionable?: boolean
	serialize?: boolean
}

export class ChainableAssertions implements AssertionRecord {
	private ctx: AssertionContext

	constructor(ctx: AssertionContext) {
		this.ctx = ctx
	}

	private get unversionedActual(): unknown {
		if (this.versionableActual instanceof TypeAssertionMapping) {
			return this.versionableActual.fn(
				this.ctx.typeRelationshipAssertionEntries![0][1],
				this.ctx
			)!.actual
		}
		return this.versionableActual
	}

	private get versionableActual(): VersionableActual {
		return this.ctx.versionableActual
	}

	private get serializedActual(): unknown {
		return snapshot(this.unversionedActual)
	}

	unwrap(opts?: UnwrapOptions): unknown {
		const value =
			opts?.versionable ? this.versionableActual : this.unversionedActual
		return opts?.serialize ? snapshot(value) : value
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
		assertEquals(expected, this.versionableActual, this.ctx)
		return this
	}

	satisfies(def: unknown): this {
		assertSatisfies(type.raw(def), this.versionableActual, this.ctx)
		return this
	}

	instanceOf(expected: Constructor): this {
		if (!(this.versionableActual instanceof expected)) {
			throwAssertionError({
				stack: this.ctx.assertionStack,
				message: `Expected an instance of ${expected.name} (was ${
					(
						typeof this.versionableActual === "object" &&
						this.versionableActual !== null
					) ?
						this.versionableActual.constructor.name
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
			const expectedSerialized = snapshot(args[0])
			if (!args.length || this.ctx.cfg.updateSnapshots) {
				const position = caller()
				if (this.ctx.cfg.failOnMissingSnapshots) {
					throw new MissingSnapshotError(
						`.${snapName}() at ${positionToString(position)} must be populated.`
					)
				}
				if (this.snapRequiresUpdate(expectedSerialized)) {
					const snapshotArgs: SnapshotArgs = {
						position,
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
		return Object.assign(inline, {
			toFile,
			unwrap: this.unwrap.bind(this)
		})
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
				assertEqualOrMatching(expected, this.versionableActual, this.ctx)
			else assertEquals(expected, this.versionableActual, this.ctx)

			return this
		}
		return new Proxy(immediateAssertion, {
			get: (target, prop) => (this as any)[prop]
		})
	}

	get throws(): unknown {
		const result = callAssertedFunction(this.unversionedActual as Function)
		this.ctx.versionableActual = getThrownMessage(result, this.ctx)
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

		this.ctx.versionableActual = new TypeAssertionMapping(data => {
			if (typeof data.completions === "string") {
				// if the completions were ambiguously defined, e.g. two string
				// literals with the same value, they are writen as an error
				// message to the JSON. Throw it immediately.
				throw new Error(data.completions)
			}
			return { actual: data.completions }
		})
		this.ctx.lastSnapName = "completions"
		return this.snap
	}

	get jsdoc(): any {
		if (this.ctx.cfg.skipTypes) return chainableNoOpProxy

		this.ctx.versionableActual = new TypeAssertionMapping(data => ({
			actual: formatTypeString(data.jsdoc ?? "")
		}))
		this.ctx.allowRegex = true
		return this.immediateOrChained()
	}

	get type(): any {
		if (this.ctx.cfg.skipTypes) return chainableNoOpProxy

		// We need to bind this to return an object with getters
		const self = this
		return {
			get toString() {
				self.ctx.versionableActual = new TypeAssertionMapping(data => ({
					actual: formatTypeString(data.args[0].type)
				}))
				self.ctx.allowRegex = true
				return self.immediateOrChained()
			},
			get errors() {
				self.ctx.versionableActual = new TypeAssertionMapping(data => ({
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

const declarationPrefix = "type T = "

const formatTypeString = (typeString: string) =>
	prettier
		.format(`${declarationPrefix}${typeString}`, {
			semi: false,
			printWidth: 60,
			trailingComma: "none",
			parser: "typescript",
			...getConfig().typeToStringFormat
		})
		.slice(declarationPrefix.length)
		.trimEnd()

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
	([t] extends [() => unknown] ? functionAssertions<kind> : {})

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
	unwrap: Unwrapper<expected>
}

export type Unwrapper<expected = unknown> = (opts?: UnwrapOptions) => expected

export const nonOverlappingSatisfiesMessage =
	"This type has no overlap with your satisfies constraint"

export type nonOverlappingSatisfiesMessage =
	typeof nonOverlappingSatisfiesMessage

type validateExpectedOverlaps<expected, satisfies> =
	isDisjoint<expected, satisfies> extends true ?
		ErrorType<nonOverlappingSatisfiesMessage>
	:	unknown

export type comparableValueAssertion<expected, kind extends AssertionKind> = {
	snap: snapProperty<expected, kind>
	equals: (value: expected) => nextAssertions<kind>
	instanceOf: (constructor: Constructor) => nextAssertions<kind>
	is: (value: expected) => nextAssertions<kind>
	completions: CompletionsSnap
	jsdoc: comparableValueAssertion<string, kind>
	satisfies: <const def>(
		def: type.validate<def> &
			validateExpectedOverlaps<expected, type.infer.In<def>>
	) => nextAssertions<kind>
	// This can be used to assert values without type constraints
	unknown: Omit<comparableValueAssertion<unknown, kind>, "unknown">
	unwrap: Unwrapper<expected>
}

export interface CompletionsSnap {
	(value?: Completions): void
	unwrap: Unwrapper<Completions>
}

export type TypeAssertionsRoot = {
	type: TypeAssertionProps
}

export type TypeAssertionProps = {
	toString: valueFromTypeAssertion<string | RegExp>
	errors: valueFromTypeAssertion<string | RegExp, string>
	completions: CompletionsSnap
}

export type ExternalSnapshotOptions = {
	path?: string
}
