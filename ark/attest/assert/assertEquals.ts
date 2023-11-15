import { stringify, throwInternalError } from "@arktype/util"
import * as assert from "node:assert/strict"
import type { SerializedAssertionData } from "../tsserver/getAssertionsInFile.ts"
import type { AssertionContext } from "./attest.ts"

export type ThrowAsertionErrorContext = {
	message: string
	expected?: unknown
	actual?: unknown
	ctx: AssertionContext
}

export const throwAssertionError = ({
	ctx,
	...errorArgs
}: ThrowAsertionErrorContext): never => {
	const e = new assert.AssertionError(errorArgs)
	e.stack = ctx.assertionStack
	throw e
}

export const assertEquals = (
	expected: unknown,
	actual: unknown,
	ctx: AssertionContext
) => {
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

export const assertExpectedType = (
	data: SerializedAssertionData,
	ctx: AssertionContext
) => {
	const expected = data.typeArgs[0]
	const actual = data.typeArgs[1] ?? data.args[0]
	if (!expected || !actual) {
		throwInternalError(`Unexpected type data ${stringify(data)}`)
	}
	if (actual.relationships.typeArgs[0] !== "equality") {
		assertEquals(
			expected.type,
			expected.type === actual.type
				? "(serializes to same value)"
				: actual.type,
			ctx
		)
	}
}
