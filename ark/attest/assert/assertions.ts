import {
	constructorNameOf,
	expressionOf,
	printable,
	throwInternalError
} from "@ark/util"
import type { type } from "arktype"
import * as assert from "node:assert/strict"
import { isDeepStrictEqual } from "node:util"
import type { TypeRelationshipAssertionData } from "../cache/getCachedAssertions.ts"
import type { AssertionContext } from "./attest.ts"

export type ThrowAssertionErrorContext = {
	message: string
	expected?: unknown
	actual?: unknown
	stack: string
}

export const throwAssertionError = ({
	stack,
	...errorArgs
}: ThrowAssertionErrorContext): never => {
	const e = new assert.AssertionError(errorArgs)
	e.stack = stack
	throw e
}

export class MissingSnapshotError extends Error {}

export type AssertFn = (
	expected: unknown,
	actual: unknown,
	ctx: AssertionContext
) => void

export type MappedTypeAssertionResult = {
	actual: unknown
	expected?: unknown
} | null

export type TypeAssertionMapper = (
	data: TypeRelationshipAssertionData,
	ctx: AssertionContext
) => MappedTypeAssertionResult

export class TypeAssertionMapping {
	fn: TypeAssertionMapper

	constructor(fn: TypeAssertionMapper) {
		this.fn = fn
	}
}

export const versionableAssertion =
	(fn: AssertFn): AssertFn =>
	(expected, actual, ctx) => {
		if (actual instanceof TypeAssertionMapping) {
			if (!ctx.typeAssertion) {
				throwInternalError(
					`Unexpected missing typeAssertion when passed a TypeAssertionMapper`
				)
			}
			try {
				const mapped = actual.fn(ctx.typeAssertion, ctx)
				if (mapped !== null) {
					fn(
						"expected" in mapped ? mapped.expected : expected,
						mapped.actual,
						ctx
					)
				}
			} catch (e) {
				throwAssertionError({
					stack: ctx.assertionStack,
					message: `${e}`
				})
			}
		} else fn(expected, actual, ctx)
	}

// node:assert prints the values of a failed deepStrictEqual in full, which
// for a live graph like a Type's exhausts memory (#1287), so only plain data
// gets its diff
const isPlainData = (value: unknown, seen = new Set<object>()): boolean => {
	if (typeof value === "function") return false
	if (typeof value !== "object" || value === null || seen.has(value))
		return true
	seen.add(value)
	const proto: unknown = Object.getPrototypeOf(value)
	if (proto === Date.prototype || proto === RegExp.prototype) return true
	if (proto === Map.prototype || proto === Set.prototype) {
		for (const entry of (value as Map<unknown, unknown>).entries())
			if (!isPlainData(entry, seen)) return false
		return true
	}
	if (proto !== Object.prototype && proto !== Array.prototype && proto !== null)
		return false
	return Reflect.ownKeys(value).every(k => {
		const descriptor = Object.getOwnPropertyDescriptor(value, k)!
		return "value" in descriptor && isPlainData(descriptor.value, seen)
	})
}

const maxPrintedDepth = 10

// within plain objects and arrays, other objects print as they would at the
// root, by their expression or constructor
const printableCopyOf = (value: unknown, depth: number): unknown => {
	if (typeof value === "function") return expressionOf(value) ?? value
	if (typeof value !== "object" || value === null) return value
	const proto: unknown = Object.getPrototypeOf(value)
	if (proto === Array.prototype) {
		return depth === maxPrintedDepth ? "[...]" : (
				(value as unknown[]).map(item => printableCopyOf(item, depth + 1))
			)
	}
	if (proto === Object.prototype || proto === null) {
		return depth === maxPrintedDepth ? "{...}" : (
				Object.fromEntries(
					Object.entries(value).map(([k, v]) => [
						k,
						printableCopyOf(v, depth + 1)
					])
				)
			)
	}
	return depth ?
			(expressionOf(value) ?? constructorNameOf(value) ?? "Object")
		:	value
}

// a Type or node prints as its expression, unquoted unless nested
const printFailed = (value: unknown): string => {
	const copy = printableCopyOf(value, 0)
	return typeof copy === "string" && typeof value !== "string" ?
			copy
		:	printable(copy)
}

const throwUnequal = (
	message: string,
	expected: unknown,
	actual: unknown
): never => {
	const serializedExpected = printFailed(expected)
	const serializedActual = printFailed(actual)
	throw new assert.AssertionError({
		message: `${message}
Expected: ${serializedExpected}
Actual: ${serializedActual}`,
		expected: serializedExpected,
		actual: serializedActual
	})
}

const isReference = (value: unknown) =>
	typeof value === "function" || (typeof value === "object" && value !== null)

export const assertIs = (expected: unknown, actual: unknown): void => {
	if (Object.is(actual, expected)) return
	if (isReference(expected) || isReference(actual))
		throwUnequal("Expected values to be reference-equal:", expected, actual)

	assert.equal(actual, expected)
}

const unversionedAssertEquals: AssertFn = (expected, actual, ctx) => {
	if (expected === actual) return

	try {
		if (
			typeof expected === "object" &&
			expected !== null &&
			typeof actual === "object" &&
			actual !== null
		) {
			if (expected.constructor !== actual.constructor) {
				throwUnequal(
					"Objects did not have the same constructor:",
					expected,
					actual
				)
			} else if (isPlainData(expected) && isPlainData(actual))
				assert.deepStrictEqual(actual, expected)
			else if (!isDeepStrictEqual(actual, expected)) {
				throwUnequal(
					"Expected values to be strictly deep-equal:",
					expected,
					actual
				)
			}
		} else if (
			typeof expected === "object" ||
			typeof expected === "function" ||
			typeof actual === "function" ||
			typeof actual === "function"
		) {
			throwUnequal(
				"Assertion including at least one function or object was not between reference equal items",
				expected,
				actual
			)
			// guaranteed to be two primitives at this point
		} else assert.equal(actual, expected)
	} catch (e: any) {
		// some nonsense to get a good stack trace
		e.stack = ctx.assertionStack
		throw e
	}
}

export const assertEquals: AssertFn = versionableAssertion(
	unversionedAssertEquals
)

const unversionedAssertSatisfies = (
	t: type.Any,
	data: unknown,
	ctx: AssertionContext
) => {
	try {
		t.assert(data)
	} catch (e: any) {
		e.stack = ctx.assertionStack
		throw e
	}
}

export const assertSatisfies = versionableAssertion(
	unversionedAssertSatisfies as never
)

export const typeEqualityMapping: TypeAssertionMapping =
	new TypeAssertionMapping(data => {
		const expected = data.typeArgs[0]
		const actual = data.typeArgs[1] ?? data.args[0]
		if (!expected || !actual)
			throwInternalError(`Unexpected type data ${printable(data)}`)

		if (actual.relationships.typeArgs[0] !== "equality") {
			return {
				expected: expected.type,
				actual:
					expected.type === actual.type ?
						"(serializes to same value)"
					:	actual.type
			}
		}
		return null
	})

export const assertEqualOrMatching: AssertFn = versionableAssertion(
	(expected, actual, ctx) => {
		const assertionArgs = { actual, expected, stack: ctx.assertionStack }
		if (typeof actual !== "string") {
			throwAssertionError({
				message: `Value was of type ${typeof actual} (expected a string).`,
				...assertionArgs
			})
		} else if (typeof expected === "string") {
			if (!actual.includes(expected)) {
				throwAssertionError({
					message: `Expected string '${expected}' did not appear in actual string '${actual}'.`,
					...assertionArgs
				})
			}
		} else if (expected instanceof RegExp) {
			if (!expected.test(actual)) {
				throwAssertionError({
					message: `Actual string '${actual}' did not match regex '${expected.source}'.`,
					...assertionArgs
				})
			}
		} else {
			throw new Error(
				`Expected value for this assertion should be a string or RegExp.`
			)
		}
	}
)

export type AssertedFnCallResult = {
	returned?: unknown
	threw?: string
}
export const getThrownMessage = (
	result: AssertedFnCallResult,
	ctx: AssertionContext
): string | undefined => {
	if (!("threw" in result)) {
		throwAssertionError({
			message: "Function didn't throw",
			stack: ctx.assertionStack
		})
	}

	return result.threw
}
export const callAssertedFunction = (
	asserted: Function
): AssertedFnCallResult => {
	const result: AssertedFnCallResult = {}
	try {
		result.returned = asserted()
	} catch (error) {
		result.threw = String(error)
	}
	return result
}
