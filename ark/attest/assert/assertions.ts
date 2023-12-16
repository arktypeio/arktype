import {
	ReadonlyArray,
	isArray,
	printable,
	throwInternalError
} from "@arktype/util"
import { AssertionError } from "node:assert"
import * as assert from "node:assert/strict"
import type { VersionedTypeAssertion } from "../cache/getCachedAssertions.js"
import type { TypeAssertionData } from "../cache/writeAssertionCache.js"
import type { AssertionContext } from "./attest.js"

export type ThrowAssertionErrorContext = {
	message: string
	expected?: unknown
	actual?: unknown
	ctx: AssertionContext
}

export const throwAssertionError = ({
	ctx,
	...errorArgs
}: ThrowAssertionErrorContext): never => {
	const e = new assert.AssertionError(errorArgs)
	e.stack = ctx.assertionStack
	throw e
}

export type AssertFn = (
	expected: unknown,
	actual: unknown,
	ctx: AssertionContext
) => void

export type MappedTypeAssertionResult = {
	actual: unknown
	expected?: unknown
} | null

export class TypeAssertionMapping {
	constructor(
		public fn: (
			data: TypeAssertionData,
			ctx: AssertionContext
		) => MappedTypeAssertionResult
	) {}
}

export const versionableAssertion =
	(fn: AssertFn): AssertFn =>
	(expected, actual, ctx) => {
		if (actual instanceof TypeAssertionMapping) {
			if (!ctx.typeAssertionEntries) {
				throwInternalError(
					`Unexpected missing typeAssertionEntries when passed a TypeAssertionMapper`
				)
			}
			for (const [version, data] of ctx.typeAssertionEntries!) {
				let errorMessage = ""
				try {
					const mapped = actual.fn(data, ctx)
					if (mapped !== null) {
						fn(
							"expected" in mapped ? mapped.expected : expected,
							mapped.actual,
							ctx
						)
					}
				} catch (e) {
					errorMessage += `❌TypeScript@${version}:${e}\n`
				}
				if (errorMessage) {
					throw new AssertionError({ message: errorMessage })
				}
			}
		} else {
			fn(expected, actual, ctx)
		}
	}

const unversionedAssertEquals: AssertFn = (expected, actual, ctx) => {
	if (expected === actual) {
		return
	}
	if (typeof expected === "object" && typeof actual === "object") {
		try {
			assert.deepStrictEqual(actual, expected)
		} catch (e: any) {
			e.stack = ctx.assertionStack
			throw e
		}
	} else {
		// some nonsense to get a good stack trace
		try {
			assert.strictEqual(actual, expected)
		} catch (e: any) {
			e.stack = ctx.assertionStack
			throw e
		}
	}
}

export const assertEquals = versionableAssertion(unversionedAssertEquals)

export const typeEqualityMapping = new TypeAssertionMapping((data) => {
	const expected = data.typeArgs[0]
	const actual = data.typeArgs[1] ?? data.args[0]
	if (!expected || !actual) {
		throwInternalError(`Unexpected type data ${printable(data)}`)
	}
	if (actual.relationships.typeArgs[0] !== "equality") {
		return {
			expected: expected.type,
			actual:
				expected.type === actual.type
					? "(serializes to same value)"
					: actual.type
		}
	}
	return null
})

export const assertEqualOrMatching = versionableAssertion(
	(expected, actual, ctx) => {
		const assertionArgs = { actual, expected, ctx }
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
) => {
	if (!("threw" in result)) {
		throwAssertionError({ message: "Function didn't throw.", ctx })
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
